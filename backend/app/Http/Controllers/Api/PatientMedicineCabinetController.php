<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientMedicineCabinetItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PatientMedicineCabinetController extends Controller
{
    private function uploadDisk(): string
    {
        return (string) config('filesystems.upload_disk', 'public');
    }

    private function formatCabinetItem(PatientMedicineCabinetItem $row): array
    {
        return [
            'id' => $row->id,
            'patient_user_id' => $row->patient_user_id,
            'family_member_id' => $row->family_member_id,
            'family_member_name' => $row->familyMember?->name,
            'patient_medicine_purchase_id' => $row->patient_medicine_purchase_id,
            'prescription_id' => $row->prescription_id,
            'medicine_request_id' => $row->medicine_request_id,
            'pharmacy_id' => $row->pharmacy_id,
            'pharmacy_name' => $row->pharmacy?->name,
            'medication_name' => $row->medication_name,
            'form' => $row->form,
            'dosage_strength' => $row->dosage_strength,
            'daily_dosage' => $row->daily_dosage,
            'quantity' => $row->quantity,
            'refill_reminder_days' => $row->refill_reminder_days,
            'reminder_times' => array_values(array_filter(
                array_map(
                    fn ($v) => is_string($v) && preg_match('/^\d{2}:\d{2}$/', $v) ? $v : null,
                    $row->reminder_times_json ?? []
                )
            )),
            'expiration_date' => optional($row->expiration_date)?->toDateString(),
            'photo_url' => $row->photo_url,
            'manufacturer' => $row->manufacturer,
            'requires_refrigeration' => $row->requires_refrigeration,
            'note' => $row->note,
            'doctor_name' => $row->prescription?->doctor_name,
            'patient_name' => $row->prescription?->patient_name,
            'prescription_code' => $row->prescription?->prescription_code,
            'prescription_requested_at' => optional($row->prescription?->requested_at)?->toIso8601String(),
            'treatment_duration_days' => $row->medicineRequest?->duration_days,
            'prescription_note' => $row->medicineRequest?->notes,
            'created_at' => $row->created_at->toIso8601String(),
            'updated_at' => $row->updated_at->toIso8601String(),
        ];
    }

    private function deleteIfLocalStorageUrl(?string $url): void
    {
        if (!$url) {
            return;
        }

        $disk = $this->uploadDisk();
        $parsed = parse_url($url, PHP_URL_PATH);
        if (!$parsed) {
            return;
        }

        if (str_starts_with($parsed, '/storage/')) {
            $relative = ltrim(substr($parsed, strlen('/storage/')), '/');
        } else {
            $relative = ltrim($parsed, '/');
        }

        if ($relative !== '') {
            Storage::disk($disk)->delete($relative);
        }
    }

    public function index(Request $request)
    {
        $rows = PatientMedicineCabinetItem::query()
            ->where('patient_user_id', $request->user()->id)
            ->with([
                'familyMember:id,name',
                'pharmacy:id,name',
                'prescription:id,doctor_name,patient_name,requested_at',
                'medicineRequest:id,duration_days,notes',
            ])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($rows->map(fn (PatientMedicineCabinetItem $row) => $this->formatCabinetItem($row))->values());
    }

    public function update(Request $request, PatientMedicineCabinetItem $cabinetItem)
    {
        if ($cabinetItem->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $patientId = $request->user()->id;
        $data = $request->validate([
            'family_member_id' => [
                'nullable',
                'integer',
                Rule::exists('family_members', 'id')->where(fn ($query) => $query->where('patient_user_id', $patientId)),
            ],
            'medication_name' => ['sometimes', 'required', 'string', 'max:255'],
            'form' => ['nullable', 'string', 'max:120'],
            'dosage_strength' => ['nullable', 'string', 'max:120'],
            'daily_dosage' => ['nullable', 'integer', 'min:1', 'max:24'],
            'quantity' => ['sometimes', 'required', 'integer', 'min:1', 'max:100000'],
            'expiration_date' => ['nullable', 'date'],
            'manufacturer' => ['nullable', 'string', 'max:255'],
            'requires_refrigeration' => ['sometimes', 'boolean'],
            'refill_reminder_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'reminder_times' => ['nullable', 'array', 'max:24'],
            'reminder_times.*' => ['required', 'date_format:H:i'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($cabinetItem->prescription_id !== null) {
            unset($data['medication_name'], $data['form'], $data['dosage_strength'], $data['daily_dosage'], $data['quantity']);
        }

        if (array_key_exists('reminder_times', $data)) {
            $targetDailyDosage = $data['daily_dosage'] ?? $cabinetItem->daily_dosage;
            if (is_int($targetDailyDosage) && $targetDailyDosage > 0 && count($data['reminder_times']) !== $targetDailyDosage) {
                return response()->json([
                    'message' => "Le nombre d'heures doit correspondre a la dose journaliere ($targetDailyDosage).",
                ], 422);
            }
            $data['reminder_times_json'] = array_values($data['reminder_times']);
            unset($data['reminder_times']);
        }

        $cabinetItem->update($data);

        $fresh = $cabinetItem->fresh(['familyMember:id,name', 'pharmacy:id,name', 'prescription:id,doctor_name,patient_name,requested_at', 'medicineRequest:id,duration_days,notes']);

        return response()->json([
            'message' => 'Medicament mis a jour.',
            'item' => $this->formatCabinetItem($fresh),
        ]);
    }

    public function store(Request $request)
    {
        $patientId = $request->user()->id;
        $data = $request->validate([
            'family_member_id' => [
                'nullable',
                'integer',
                Rule::exists('family_members', 'id')->where(fn ($query) => $query->where('patient_user_id', $patientId)),
            ],
            'medication_name' => ['required', 'string', 'max:255'],
            'form' => ['nullable', 'string', 'max:120'],
            'dosage_strength' => ['nullable', 'string', 'max:120'],
            'daily_dosage' => ['nullable', 'integer', 'min:1', 'max:24'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'refill_reminder_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'reminder_times' => ['nullable', 'array', 'max:24'],
            'reminder_times.*' => ['required', 'date_format:H:i'],
            'expiration_date' => ['nullable', 'date'],
            'manufacturer' => ['nullable', 'string', 'max:255'],
            'requires_refrigeration' => ['sometimes', 'boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('reminder_times', $data)) {
            $targetDailyDosage = $data['daily_dosage'] ?? null;
            if (is_int($targetDailyDosage) && $targetDailyDosage > 0 && count($data['reminder_times']) !== $targetDailyDosage) {
                return response()->json([
                    'message' => "Le nombre d'heures doit correspondre a la dose journaliere ($targetDailyDosage).",
                ], 422);
            }
        }

        $row = PatientMedicineCabinetItem::create([
            'patient_user_id' => $patientId,
            'family_member_id' => $data['family_member_id'] ?? null,
            'patient_medicine_purchase_id' => null,
            'prescription_id' => null,
            'medicine_request_id' => null,
            'pharmacy_id' => null,
            'medication_name' => $data['medication_name'],
            'form' => $data['form'] ?? null,
            'dosage_strength' => $data['dosage_strength'] ?? null,
            'daily_dosage' => $data['daily_dosage'] ?? null,
            'quantity' => $data['quantity'],
            'refill_reminder_days' => $data['refill_reminder_days'] ?? 7,
            'reminder_times_json' => $data['reminder_times'] ?? [],
            'expiration_date' => $data['expiration_date'] ?? null,
            'photo_url' => null,
            'manufacturer' => $data['manufacturer'] ?? null,
            'requires_refrigeration' => (bool) ($data['requires_refrigeration'] ?? false),
            'note' => $data['note'] ?? null,
        ]);

        $fresh = $row->fresh(['familyMember:id,name', 'pharmacy:id,name', 'prescription:id,doctor_name,patient_name,requested_at', 'medicineRequest:id,duration_days,notes']);

        return response()->json([
            'message' => 'Medicament ajoute au cabinet.',
            'item' => $this->formatCabinetItem($fresh),
        ], 201);
    }

    public function uploadPhoto(Request $request, PatientMedicineCabinetItem $cabinetItem)
    {
        if ($cabinetItem->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $request->validate([
            'photo' => ['required', 'image', 'max:4096'],
        ]);

        $disk = $this->uploadDisk();
        $uploaded = $request->file('photo');
        $path = $uploaded->store('cabinet/photos', $disk);
        $publicUrl = Storage::disk($disk)->url($path);

        $this->deleteIfLocalStorageUrl($cabinetItem->photo_url);
        $cabinetItem->update(['photo_url' => $publicUrl]);

        return response()->json([
            'message' => 'Photo enregistree.',
            'photo_url' => $publicUrl,
        ]);
    }

    public function destroy(Request $request, PatientMedicineCabinetItem $cabinetItem)
    {
        if ($cabinetItem->patient_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $this->deleteIfLocalStorageUrl($cabinetItem->photo_url);
        $cabinetItem->delete();

        return response()->json(['message' => 'Medicament retire du cabinet.']);
    }
}
