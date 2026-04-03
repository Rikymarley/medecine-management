<?php

namespace Database\Seeders;

use App\Models\EmergencyContact;
use App\Models\FamilyMember;
use App\Models\GuestPatient;
use App\Models\MedicalHistoryEntry;
use App\Models\MedicineRequest;
use App\Models\PatientMedicinePurchase;
use App\Models\Pharmacy;
use App\Models\PharmacyResponse;
use App\Models\Prescription;
use App\Models\PrescriptionStatusLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DomainDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@retel.ht'],
            [
                'name' => 'Admin Retel',
                'password' => Hash::make('12345678'),
                'role' => 'admin',
                'account_status' => 'active',
                'verification_status' => 'approved',
                'verified_at' => now(),
            ]
        );

        $pharmacyA = Pharmacy::updateOrCreate(
            ['name' => 'Pharma 21'],
            [
                'pharmacy_mode' => 'quick_manual',
                'phone' => '+509-3333-2100',
                'address' => 'Delmas 33, Port-au-Prince',
                'open_now' => true,
                'opening_hours' => "Lundi: 08:00-18:00\nMardi: 08:00-18:00\nMercredi: 08:00-18:00\nJeudi: 08:00-18:00\nVendredi: 08:00-18:00\nSamedi: 08:00-14:00\nDimanche: Ferme",
                'reliability_score' => 82,
                'services' => 'Vaccination, Prise de tension, Livraison',
                'payment_methods' => 'Cash, MonCash, NatCash',
                'license_verified' => true,
                'last_status_updated_at' => now()->subMinutes(8),
            ]
        );

        $pharmacyB = Pharmacy::updateOrCreate(
            ['name' => 'Jadis Pharma'],
            [
                'pharmacy_mode' => 'quick_manual',
                'phone' => '+509-4444-2200',
                'address' => 'Bon Repos 45, Croix-des-Bouquets',
                'open_now' => true,
                'opening_hours' => "Lundi: 08:00-18:00\nMardi: 08:00-18:00\nMercredi: 08:00-18:00\nJeudi: 08:00-18:00\nVendredi: 08:00-18:00\nSamedi: 08:00-14:00\nDimanche: Ferme",
                'reliability_score' => 76,
                'services' => 'Conseil pharmaceutique, Test glycemie',
                'payment_methods' => 'Cash, NatCash',
                'license_verified' => true,
                'last_status_updated_at' => now()->subMinutes(16),
            ]
        );

        $doctor = User::updateOrCreate(
            ['email' => 'minoltab.florville@gmail.com'],
            [
                'name' => 'Minolta B. Florville',
                'password' => Hash::make('12345678'),
                'role' => 'doctor',
                'phone' => '+509-3800-1111',
                'specialty' => 'Medecine generale',
                'verification_status' => 'approved',
                'verified_at' => now(),
                'verified_by' => $admin->id,
                'license_verified' => true,
                'license_verified_at' => now(),
                'license_verification_notes' => 'Verification association medecins.',
                'can_verify_accounts' => true,
            ]
        );

        $pharmacyA->update([
            'license_verified_at' => now(),
            'license_verified_by_doctor_id' => $doctor->id,
            'license_verification_notes' => 'Licence validee par association.',
        ]);
        $pharmacyB->update([
            'license_verified_at' => now(),
            'license_verified_by_doctor_id' => $doctor->id,
            'license_verification_notes' => 'Licence validee par association.',
        ]);

        $pharmacyUser = User::updateOrCreate(
            ['email' => 'pharma21@gmail.com'],
            [
                'name' => 'Pharma 21',
                'password' => Hash::make('12345678'),
                'role' => 'pharmacy',
                'phone' => '+509-3333-2100',
                'pharmacy_id' => $pharmacyA->id,
                'verification_status' => 'approved',
                'verified_at' => now(),
                'verified_by' => $admin->id,
            ]
        );

        $patient = User::updateOrCreate(
            ['email' => 'frederic.florville@gmail.com'],
            [
                'name' => 'Frederic Florville',
                'password' => Hash::make('12345678'),
                'role' => 'patient',
                'phone' => '+509-3700-2222',
                'whatsapp' => '+509-3700-2222',
                'address' => 'Petion-Ville',
                'ninu' => 'NINU-HT-0001',
                'verification_status' => 'approved',
                'verified_at' => now(),
                'weight_kg' => 74.5,
                'height_cm' => 176.0,
                'vaccination_up_to_date' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'jadispharma@gmail.com'],
            [
                'name' => 'JadIsPharma',
                'password' => Hash::make('12345678'),
                'role' => 'pharmacy',
                'phone' => '+509-4444-2200',
                'pharmacy_id' => $pharmacyB->id,
                'verification_status' => 'approved',
                'verified_at' => now(),
                'verified_by' => $admin->id,
            ]
        );

        $family = FamilyMember::updateOrCreate(
            ['patient_user_id' => $patient->id, 'name' => 'Iris Florville'],
            [
                'date_of_birth' => '2017-09-20',
                'age' => 8,
                'gender' => 'female',
                'relationship' => 'child',
                'blood_type' => 'AB+',
                'allergies' => 'Aucune connue',
                'primary_caregiver' => true,
            ]
        );

        $guest = GuestPatient::updateOrCreate(
            ['doctor_user_id' => $doctor->id, 'name' => 'Patient Papier Demo'],
            [
                'phone' => '+509-3555-9000',
                'address' => 'Carrefour',
                'age' => 54,
                'gender' => 'male',
                'notes' => 'Patient sans smartphone.',
            ]
        );

        $rx = Prescription::updateOrCreate(
            ['print_code' => 'RX-DEMO-0001'],
            [
                'doctor_user_id' => $doctor->id,
                'patient_user_id' => $patient->id,
                'family_member_id' => null,
                'guest_patient_id' => null,
                'patient_name' => $patient->name,
                'patient_phone' => $patient->phone,
                'doctor_name' => $doctor->name,
                'source' => 'app',
                'status' => 'partially_available',
                'requested_at' => now()->subMinutes(35),
                'qr_token' => Str::random(32),
                'print_count' => 1,
                'printed_at' => now()->subMinutes(30),
            ]
        );

        $rxFamily = Prescription::updateOrCreate(
            ['print_code' => 'RX-DEMO-0002'],
            [
                'doctor_user_id' => $doctor->id,
                'patient_user_id' => $patient->id,
                'family_member_id' => $family->id,
                'guest_patient_id' => null,
                'patient_name' => $patient->name,
                'patient_phone' => $patient->phone,
                'doctor_name' => $doctor->name,
                'source' => 'app',
                'status' => 'available',
                'requested_at' => now()->subMinutes(20),
                'qr_token' => Str::random(32),
                'print_count' => 1,
                'printed_at' => now()->subMinutes(18),
            ]
        );

        $rxGuest = Prescription::updateOrCreate(
            ['print_code' => 'RX-DEMO-0003'],
            [
                'doctor_user_id' => $doctor->id,
                'patient_user_id' => null,
                'family_member_id' => null,
                'guest_patient_id' => $guest->id,
                'patient_name' => $guest->name,
                'patient_phone' => $guest->phone,
                'doctor_name' => $doctor->name,
                'source' => 'paper',
                'status' => 'sent_to_pharmacies',
                'requested_at' => now()->subMinutes(10),
                'qr_token' => Str::random(32),
            ]
        );

        $m1 = MedicineRequest::updateOrCreate(
            ['prescription_id' => $rx->id, 'name' => 'Amoxicilline'],
            ['strength' => '500mg', 'form' => 'Capsule', 'quantity' => 10, 'generic_allowed' => true, 'conversion_allowed' => false]
        );
        $m2 = MedicineRequest::updateOrCreate(
            ['prescription_id' => $rx->id, 'name' => 'Paracetamol'],
            ['strength' => '500mg', 'form' => 'Comprime', 'quantity' => 20, 'generic_allowed' => true, 'conversion_allowed' => false]
        );
        $m3 = MedicineRequest::updateOrCreate(
            ['prescription_id' => $rxFamily->id, 'name' => 'Omeprazole'],
            ['strength' => '20mg', 'form' => 'Capsule', 'quantity' => 14, 'generic_allowed' => true, 'conversion_allowed' => false]
        );

        PharmacyResponse::updateOrCreate(
            ['pharmacy_id' => $pharmacyA->id, 'prescription_id' => $rx->id, 'medicine_request_id' => $m1->id],
            ['status' => 'available', 'responded_at' => now()->subMinutes(12), 'expires_at' => now()->addMinutes(48)]
        );
        PharmacyResponse::updateOrCreate(
            ['pharmacy_id' => $pharmacyA->id, 'prescription_id' => $rx->id, 'medicine_request_id' => $m2->id],
            ['status' => 'out_of_stock', 'responded_at' => now()->subMinutes(11), 'expires_at' => now()->addMinutes(49)]
        );
        PharmacyResponse::updateOrCreate(
            ['pharmacy_id' => $pharmacyB->id, 'prescription_id' => $rx->id, 'medicine_request_id' => $m2->id],
            ['status' => 'low', 'responded_at' => now()->subMinutes(10), 'expires_at' => now()->addMinutes(50)]
        );
        PharmacyResponse::updateOrCreate(
            ['pharmacy_id' => $pharmacyA->id, 'prescription_id' => $rxFamily->id, 'medicine_request_id' => $m3->id],
            ['status' => 'available', 'responded_at' => now()->subMinutes(9), 'expires_at' => now()->addMinutes(51)]
        );

        PatientMedicinePurchase::updateOrCreate(
            [
                'patient_user_id' => $patient->id,
                'prescription_id' => $rx->id,
                'medicine_request_id' => $m1->id,
                'pharmacy_id' => $pharmacyA->id,
            ],
            ['quantity' => 6]
        );

        EmergencyContact::updateOrCreate(
            ['patient_user_id' => $patient->id, 'name' => 'Hopital Notre Dame'],
            [
                'phone' => '2383470',
                'category' => 'hospital',
                'city' => 'Cap Haitien',
                'department' => 'Nord',
                'address' => 'Adresse ND du Nord #1',
                'available_hours' => '24/7',
                'is_24_7' => true,
                'is_favorite' => true,
                'priority' => 1,
            ]
        );

        MedicalHistoryEntry::updateOrCreate(
            ['patient_user_id' => $patient->id, 'title' => 'Gastrite chronique', 'family_member_id' => null],
            [
                'entry_code' => 'MH-DEMO-0001',
                'doctor_user_id' => $doctor->id,
                'prescription_id' => $rx->id,
                'type' => 'condition',
                'details' => 'Suivi medical continu.',
                'started_at' => '2024-01-01',
                'status' => 'active',
                'visibility' => 'shared',
            ]
        );

        MedicalHistoryEntry::updateOrCreate(
            ['patient_user_id' => $patient->id, 'title' => 'Suivi pediatrique', 'family_member_id' => $family->id],
            [
                'entry_code' => 'MH-DEMO-0002',
                'doctor_user_id' => $doctor->id,
                'prescription_id' => $rxFamily->id,
                'type' => 'note',
                'details' => 'Controle regulier.',
                'started_at' => '2025-09-01',
                'status' => 'active',
                'visibility' => 'shared',
            ]
        );

        PrescriptionStatusLog::updateOrCreate(
            ['prescription_id' => $rx->id, 'new_status' => 'partially_available', 'reason' => 'seed_demo'],
            [
                'old_status' => 'sent_to_pharmacies',
                'changed_by_user_id' => $pharmacyUser->id,
                'metadata' => ['seed' => true],
                'changed_at' => now()->subMinutes(10),
            ]
        );

        PrescriptionStatusLog::updateOrCreate(
            ['prescription_id' => $rxFamily->id, 'new_status' => 'available', 'reason' => 'seed_demo'],
            [
                'old_status' => 'sent_to_pharmacies',
                'changed_by_user_id' => $pharmacyUser->id,
                'metadata' => ['seed' => true],
                'changed_at' => now()->subMinutes(9),
            ]
        );
    }
}
