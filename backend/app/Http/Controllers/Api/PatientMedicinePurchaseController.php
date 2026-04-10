<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientMedicineCabinetItem;
use App\Models\PatientMedicinePurchase;
use App\Models\Prescription;
use App\Services\PrescriptionAccessEvaluator;
use Illuminate\Http\Request;

class PatientMedicinePurchaseController extends Controller
{
    private function syncCabinetItemFromPurchase(PatientMedicinePurchase $purchase, Prescription $prescription): void
    {
        $medicineRequest = $prescription->medicineRequests()
            ->where('id', $purchase->medicine_request_id)
            ->first();

        if (!$medicineRequest) {
            return;
        }

        PatientMedicineCabinetItem::query()->updateOrCreate(
            [
                'patient_medicine_purchase_id' => $purchase->id,
            ],
            [
                'patient_user_id' => $purchase->patient_user_id,
                'family_member_id' => $prescription->family_member_id,
                'prescription_id' => $prescription->id,
                'medicine_request_id' => $medicineRequest->id,
                'pharmacy_id' => $purchase->pharmacy_id,
                'medication_name' => $medicineRequest->name,
                'form' => $medicineRequest->form,
                'dosage_strength' => $medicineRequest->strength,
                'daily_dosage' => $medicineRequest->daily_dosage,
                'quantity' => $purchase->quantity ?? 1,
            ]
        );
    }

    public function index(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $purchases = PatientMedicinePurchase::query()
            ->where('patient_user_id', $request->user()->id)
            ->where('prescription_id', $prescription->id)
            ->get();

        return response()->json($purchases);
    }

    public function upsert(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'medicine_request_id' => ['required', 'integer', 'exists:medicine_requests,id'],
            'pharmacy_id' => ['required', 'integer', 'exists:pharmacies,id'],
            'purchased' => ['required', 'boolean'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ]);

        $belongsToPrescription = $prescription->medicineRequests()
            ->where('id', $data['medicine_request_id'])
            ->exists();

        if (!$belongsToPrescription) {
            return response()->json(['message' => "Ce medicament n'appartient pas a cette ordonnance."], 422);
        }

        $attributes = [
            'patient_user_id' => $request->user()->id,
            'prescription_id' => $prescription->id,
            'medicine_request_id' => $data['medicine_request_id'],
            'pharmacy_id' => $data['pharmacy_id'],
        ];

        if ($data['purchased']) {
            $purchase = PatientMedicinePurchase::updateOrCreate(
                $attributes,
                ['quantity' => $data['quantity'] ?? 1]
            );
            $this->syncCabinetItemFromPurchase($purchase, $prescription);

            return response()->json($purchase, 201);
        }

        $purchase = PatientMedicinePurchase::query()->where($attributes)->first();
        if ($purchase) {
            PatientMedicineCabinetItem::query()
                ->where('patient_medicine_purchase_id', $purchase->id)
                ->delete();
            $purchase->delete();
        }

        return response()->json(['message' => 'Mise a jour enregistree.']);
    }

    public function upsertBatch(Request $request, Prescription $prescription)
    {
        if (!$this->canAccessAsPatient($request, $prescription)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.medicine_request_id' => ['required', 'integer', 'exists:medicine_requests,id'],
            'items.*.pharmacy_id' => ['required', 'integer', 'exists:pharmacies,id'],
            'items.*.purchased' => ['required', 'boolean'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ]);

        $allowedMedicineIds = $prescription->medicineRequests()->pluck('id')->all();
        $allowedSet = array_flip($allowedMedicineIds);

        foreach ($data['items'] as $item) {
            if (!isset($allowedSet[$item['medicine_request_id']])) {
                return response()->json(['message' => "Un medicament n'appartient pas a cette ordonnance."], 422);
            }

            $attributes = [
                'patient_user_id' => $request->user()->id,
                'prescription_id' => $prescription->id,
                'medicine_request_id' => $item['medicine_request_id'],
                'pharmacy_id' => $item['pharmacy_id'],
            ];

            if ($item['purchased']) {
                $purchase = PatientMedicinePurchase::updateOrCreate(
                    $attributes,
                    ['quantity' => $item['quantity'] ?? 1]
                );
                $this->syncCabinetItemFromPurchase($purchase, $prescription);
            } else {
                $purchase = PatientMedicinePurchase::query()->where($attributes)->first();
                if ($purchase) {
                    PatientMedicineCabinetItem::query()
                        ->where('patient_medicine_purchase_id', $purchase->id)
                        ->delete();
                    $purchase->delete();
                }
            }
        }

        return response()->json(['message' => 'Mise a jour en lot enregistree.']);
    }

    private function canAccessAsPatient(Request $request, Prescription $prescription): bool
    {
        return PrescriptionAccessEvaluator::canAccessAsPatient($request->user(), $prescription);
    }
}
