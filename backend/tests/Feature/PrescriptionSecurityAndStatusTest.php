<?php

namespace Tests\Feature;

use App\Models\MedicineRequest;
use App\Models\Pharmacy;
use App\Models\PharmacyResponse;
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
            'license_verified' => true,
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

    public function test_doctor_cannot_create_prescription_when_license_not_verified(): void
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => false,
            'specialty' => 'Medecine generale',
            'phone' => '+509-1234-5678',
            'whatsapp' => '+509-1234-5678',
            'address' => 'Rue 1',
            'city' => 'Cap Haitien',
            'department' => 'Nord',
            'languages' => 'Francais, Kreyol',
            'consultation_hours' => '08:00-17:00',
            'license_number' => 'DOC-LV0',
            'years_experience' => 8,
            'consultation_fee_range' => '500-1000 HTG',
            'latitude' => '19.7590',
            'longitude' => '-72.1981',
        ]);
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);

        Sanctum::actingAs($doctor);
        $response = $this->postJson('/api/prescriptions', [
            'patient_name' => $patient->name,
            'patient_user_id' => $patient->id,
            'medicine_requests' => [
                [
                    'name' => 'Paracetamol',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => "Licence non verifiee. Creation d'ordonnance/historique medical indisponible.",
        ]);
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
            'license_verified' => true,
            'specialty' => 'Medecine generale',
            'phone' => '+509-1234-5678',
            'whatsapp' => '+509-1234-5678',
            'address' => 'Rue 1',
            'city' => 'Cap Haitien',
            'department' => 'Nord',
            'languages' => 'Francais, Kreyol',
            'consultation_hours' => '08:00-17:00',
            'license_number' => 'DOC-001',
            'years_experience' => 8,
            'consultation_fee_range' => '500-1000 HTG',
            'latitude' => '19.7590',
            'longitude' => '-72.1981',
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Test',
            'open_now' => true,
            'reliability_score' => 0,
            'latitude' => '19.7580',
            'longitude' => '-72.2000',
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

    public function test_new_prescription_reuses_recent_positive_pharmacy_response_for_same_medicine(): void
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => true,
            'specialty' => 'Medecine generale',
            'phone' => '+509-1234-5678',
            'whatsapp' => '+509-1234-5678',
            'address' => 'Rue 1',
            'city' => 'Cap Haitien',
            'department' => 'Nord',
            'languages' => 'Francais, Kreyol',
            'consultation_hours' => '08:00-17:00',
            'license_number' => 'DOC-002',
            'years_experience' => 7,
            'consultation_fee_range' => '500-1000 HTG',
            'latitude' => '19.7590',
            'longitude' => '-72.1981',
        ]);
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Match',
            'open_now' => true,
            'reliability_score' => 0,
            'latitude' => '19.7580',
            'longitude' => '-72.2000',
        ]);

        $oldPrescription = Prescription::create([
            'doctor_user_id' => $doctor->id,
            'patient_user_id' => $patient->id,
            'doctor_name' => $doctor->name,
            'patient_name' => $patient->name,
            'status' => 'sent_to_pharmacies',
        ]);

        $oldMedicine = MedicineRequest::create([
            'prescription_id' => $oldPrescription->id,
            'name' => 'Amoxicillin',
            'strength' => '500mg',
            'form' => 'capsule',
            'quantity' => 1,
            'generic_allowed' => true,
            'conversion_allowed' => false,
        ]);

        PharmacyResponse::create([
            'pharmacy_id' => $pharmacy->id,
            'prescription_id' => $oldPrescription->id,
            'medicine_request_id' => $oldMedicine->id,
            'status' => 'available',
            'responded_at' => now()->subMinutes(3),
            'expires_at' => now()->addMinutes(30),
        ]);

        Sanctum::actingAs($doctor);
        $response = $this->postJson('/api/prescriptions', [
            'patient_name' => $patient->name,
            'patient_user_id' => $patient->id,
            'medicine_requests' => [
                [
                    'name' => 'Amoxicillin',
                    'strength' => '500mg',
                    'form' => 'capsule',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertCreated();
        $newId = (int) $response->json('id');
        $newMedicineId = (int) data_get($response->json(), 'medicine_requests.0.id');

        $this->assertDatabaseHas('pharmacy_responses', [
            'prescription_id' => $newId,
            'medicine_request_id' => $newMedicineId,
            'pharmacy_id' => $pharmacy->id,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('prescriptions', [
            'id' => $newId,
            'status' => 'available',
        ]);
    }

    public function test_new_prescription_does_not_reuse_out_of_stock_as_approval(): void
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => true,
            'specialty' => 'Medecine generale',
            'phone' => '+509-1234-5678',
            'whatsapp' => '+509-1234-5678',
            'address' => 'Rue 1',
            'city' => 'Cap Haitien',
            'department' => 'Nord',
            'languages' => 'Francais, Kreyol',
            'consultation_hours' => '08:00-17:00',
            'license_number' => 'DOC-003',
            'years_experience' => 9,
            'consultation_fee_range' => '500-1000 HTG',
            'latitude' => '19.7590',
            'longitude' => '-72.1981',
        ]);
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Rupture',
            'open_now' => true,
            'reliability_score' => 0,
            'latitude' => '19.7580',
            'longitude' => '-72.2000',
        ]);

        $oldPrescription = Prescription::create([
            'doctor_user_id' => $doctor->id,
            'patient_user_id' => $patient->id,
            'doctor_name' => $doctor->name,
            'patient_name' => $patient->name,
            'status' => 'sent_to_pharmacies',
        ]);

        $oldMedicine = MedicineRequest::create([
            'prescription_id' => $oldPrescription->id,
            'name' => 'Ibuprofen',
            'strength' => '200mg',
            'form' => 'tablet',
            'quantity' => 1,
            'generic_allowed' => true,
            'conversion_allowed' => false,
        ]);

        PharmacyResponse::create([
            'pharmacy_id' => $pharmacy->id,
            'prescription_id' => $oldPrescription->id,
            'medicine_request_id' => $oldMedicine->id,
            'status' => 'out_of_stock',
            'responded_at' => now()->subMinutes(2),
            'expires_at' => now()->addMinutes(30),
        ]);

        Sanctum::actingAs($doctor);
        $response = $this->postJson('/api/prescriptions', [
            'patient_name' => $patient->name,
            'patient_user_id' => $patient->id,
            'medicine_requests' => [
                [
                    'name' => 'Ibuprofen',
                    'strength' => '200mg',
                    'form' => 'tablet',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertCreated();
        $newId = (int) $response->json('id');

        $this->assertDatabaseMissing('pharmacy_responses', [
            'prescription_id' => $newId,
            'pharmacy_id' => $pharmacy->id,
        ]);
        $this->assertDatabaseHas('prescriptions', [
            'id' => $newId,
            'status' => 'sent_to_pharmacies',
        ]);
    }

    public function test_doctor_cannot_create_prescription_without_gps(): void
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => true,
            'latitude' => null,
            'longitude' => null,
        ]);
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);

        Sanctum::actingAs($doctor);
        $response = $this->postJson('/api/prescriptions', [
            'patient_name' => $patient->name,
            'patient_user_id' => $patient->id,
            'medicine_requests' => [
                [
                    'name' => 'Paracetamol',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Profil medecin incomplet. Completion a 100% requise (Bio facultatif).',
        ]);
        $response->assertJsonPath('missing_fields.0', 'specialite');
    }

    public function test_pharmacy_cannot_confirm_availability_without_gps(): void
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'verification_status' => 'approved',
        ]);
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => true,
            'latitude' => '19.7590',
            'longitude' => '-72.1981',
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Sans GPS',
            'open_now' => true,
            'reliability_score' => 0,
            'latitude' => null,
            'longitude' => null,
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

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'GPS requis: veuillez renseigner latitude et longitude de la pharmacie avant de confirmer une disponibilite.',
        ]);
    }
}
