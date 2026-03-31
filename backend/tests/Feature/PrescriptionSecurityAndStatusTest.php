<?php

namespace Tests\Feature;

use App\Models\MedicineRequest;
use App\Models\Pharmacy;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrescriptionSecurityAndStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_cannot_create_prescription(): void
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        Sanctum::actingAs($patient);

        $response = $this->postJson('/api/prescriptions', [
            'patient_name' => 'Any Patient',
            'medicine_requests' => [
                [
                    'name' => 'Paracetamol',
                ],
            ],
        ]);

        $response->assertStatus(403);
    }

    public function test_patient_cannot_complete_other_patient_prescription(): void
    {
        $owner = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        $otherPatient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
        ]);

        $prescription = Prescription::create([
            'doctor_user_id' => $doctor->id,
            'patient_user_id' => $owner->id,
            'doctor_name' => $doctor->name,
            'patient_name' => $owner->name,
            'status' => 'sent_to_pharmacies',
        ]);

        Sanctum::actingAs($otherPatient);
        $response = $this->patchJson("/api/patient/prescriptions/{$prescription->id}/complete");

        $response->assertStatus(403);
    }

    public function test_pharmacy_response_updates_status_and_creates_status_log(): void
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Test',
            'open_now' => true,
            'reliability_score' => 0,
        ]);
        $pharmacyUser = User::factory()->create([
            'role' => 'pharmacy',
            'pharmacy_id' => $pharmacy->id,
            'verification_status' => 'approved',
        ]);

        $prescription = Prescription::create([
            'doctor_user_id' => $doctor->id,
            'patient_user_id' => $patient->id,
            'doctor_name' => $doctor->name,
            'patient_name' => $patient->name,
            'status' => 'sent_to_pharmacies',
        ]);

        $medicineRequest = MedicineRequest::create([
            'prescription_id' => $prescription->id,
            'name' => 'Paracetamol',
            'strength' => null,
            'form' => null,
            'quantity' => 1,
            'generic_allowed' => true,
            'conversion_allowed' => false,
        ]);

        Sanctum::actingAs($pharmacyUser);
        $response = $this->postJson('/api/pharmacy-responses', [
            'pharmacy_id' => $pharmacy->id,
            'prescription_id' => $prescription->id,
            'medicine_request_id' => $medicineRequest->id,
            'status' => 'available',
            'expires_at_minutes' => 60,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('prescriptions', [
            'id' => $prescription->id,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('prescription_status_logs', [
            'prescription_id' => $prescription->id,
            'old_status' => 'sent_to_pharmacies',
            'new_status' => 'available',
        ]);
    }
}
