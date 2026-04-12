<?php

namespace Database\Seeders;

use App\Models\EmergencyContact;
use App\Models\FamilyMember;
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
            ]
        );

        $demoDoctors = [
            [
                'name' => 'Jean William Pape',
                'email' => 'jwpape.demo1@retel.ht',
                'specialty' => 'Infectiologie',
                'phone' => '+509-3124-5801',
                'whatsapp' => '+509-3124-5801',
                'consultation_fee_range' => '2800 HTG',
                'consultation_hours' => '08:00 AM - 01:00 PM',
                'license_number' => 'DOC-HT-PAP-94021',
                'address' => 'Rue Capois 19, Port-au-Prince',
                'bio' => 'Specialiste en maladies infectieuses avec focus sur prevention communautaire.',
            ],
            [
                'name' => 'Pascale Solages',
                'email' => 'psolages.demo2@retel.ht',
                'specialty' => 'Pediatrie',
                'phone' => '+509-3891-4720',
                'whatsapp' => '+509-3891-4720',
                'consultation_fee_range' => '2200 HTG',
                'consultation_hours' => '09:00 AM - 03:00 PM',
                'license_number' => 'DOC-HT-PAP-95344',
                'address' => 'Delmas 33, Port-au-Prince',
                'bio' => 'Pediatre orientee vers le suivi vaccinal et la croissance de l enfant.',
            ],
            [
                'name' => 'Michel Gardere',
                'email' => 'mgardere.demo3@retel.ht',
                'specialty' => 'Cardiologie',
                'phone' => '+509-3720-9984',
                'whatsapp' => '+509-3720-9984',
                'consultation_fee_range' => '4500 HTG',
                'consultation_hours' => '10:00 AM - 04:00 PM',
                'license_number' => 'DOC-HT-PAP-96702',
                'address' => 'Avenue John Brown 11, Port-au-Prince',
                'bio' => 'Cardiologue avec experience en hypertension et insuffisance cardiaque.',
            ],
            [
                'name' => 'Nathalie Pierre-Louis',
                'email' => 'npierrelouis.demo4@retel.ht',
                'specialty' => 'Gynecologie-Obstetrique',
                'phone' => '+509-3412-6670',
                'whatsapp' => '+509-3412-6670',
                'consultation_fee_range' => '3200 HTG',
                'consultation_hours' => '08:00 AM - 12:00 PM',
                'license_number' => 'DOC-HT-PAP-97136',
                'address' => 'Petion-Ville, Rue Metellus 27',
                'bio' => 'Gynecologue obstetricienne, accompagne grossesse a risque et planning familial.',
            ],
            [
                'name' => 'Renald Monpremier',
                'email' => 'rmonpremier.demo5@retel.ht',
                'specialty' => 'Orthopedie',
                'phone' => '+509-3550-2809',
                'whatsapp' => '+509-3550-2809',
                'consultation_fee_range' => '3800 HTG',
                'consultation_hours' => '01:00 PM - 06:00 PM',
                'license_number' => 'DOC-HT-PAP-97543',
                'address' => 'Rue Clerveaux 6, Petion-Ville',
                'bio' => 'Orthopediste axe sur traumatologie, douleurs articulaires et reeducation.',
            ],
            [
                'name' => 'Lisethe Valcin',
                'email' => 'lvalcin.demo6@retel.ht',
                'specialty' => 'Dermatologie',
                'phone' => '+509-3998-1440',
                'whatsapp' => '+509-3998-1440',
                'consultation_fee_range' => '2600 HTG',
                'consultation_hours' => '11:00 AM - 05:00 PM',
                'license_number' => 'DOC-HT-PAP-98012',
                'address' => 'Canape-Vert 14, Port-au-Prince',
                'bio' => 'Dermatologue avec approche clinique et preventive des maladies cutanees.',
            ],
            [
                'name' => 'Wens Marc-Andre',
                'email' => 'wmarcandre.demo7@retel.ht',
                'specialty' => 'Neurologie',
                'phone' => '+509-3488-6302',
                'whatsapp' => '+509-3488-6302',
                'consultation_fee_range' => '5000 HTG',
                'consultation_hours' => '09:00 AM - 02:00 PM',
                'license_number' => 'DOC-HT-PAP-98659',
                'address' => 'Delmas 60, Port-au-Prince',
                'bio' => 'Neurologue specialise dans les migraines, AVC et epilepsie.',
            ],
            [
                'name' => 'Micheline Jeanty',
                'email' => 'mjeanty.demo8@retel.ht',
                'specialty' => 'Endocrinologie',
                'phone' => '+509-3367-7021',
                'whatsapp' => '+509-3367-7021',
                'consultation_fee_range' => '3600 HTG',
                'consultation_hours' => '07:00 AM - 12:00 PM',
                'license_number' => 'DOC-HT-PAP-99274',
                'address' => 'Bois Verna 22, Port-au-Prince',
                'bio' => 'Endocrinologue concentree sur diabete, thyroide et troubles hormonaux.',
            ],
            [
                'name' => 'Frantz Exume',
                'email' => 'fexume.demo9@retel.ht',
                'specialty' => 'Psychiatrie',
                'phone' => '+509-3205-4873',
                'whatsapp' => '+509-3205-4873',
                'consultation_fee_range' => '3000 HTG',
                'consultation_hours' => '02:00 PM - 07:00 PM',
                'license_number' => 'DOC-HT-PAP-99831',
                'address' => 'Turgeau 10, Port-au-Prince',
                'bio' => 'Psychiatre engage dans le suivi anxiete, depression et traumatismes.',
            ],
            [
                'name' => 'Kettly Voltaire',
                'email' => 'kvoltaire.demo10@retel.ht',
                'specialty' => 'Medecine interne',
                'phone' => '+509-3774-9156',
                'whatsapp' => '+509-3774-9156',
                'consultation_fee_range' => '2400 HTG',
                'consultation_hours' => '08:00 AM - 03:00 PM',
                'license_number' => 'DOC-HT-PAP-100245',
                'address' => 'Tabarre 41, Port-au-Prince',
                'bio' => 'Interniste orientee vers maladies chroniques et coordination des soins.',
            ],
        ];

        foreach ($demoDoctors as $demoDoctor) {
            User::updateOrCreate(
                ['email' => $demoDoctor['email']],
                [
                    'name' => $demoDoctor['name'],
                    'password' => Hash::make('12345678'),
                    'role' => 'doctor',
                    'phone' => $demoDoctor['phone'],
                    'whatsapp' => $demoDoctor['whatsapp'],
                    'address' => $demoDoctor['address'],
                    'city' => 'Port-au-Prince',
                    'department' => 'Ouest',
                    'specialty' => $demoDoctor['specialty'],
                    'consultation_fee_range' => $demoDoctor['consultation_fee_range'],
                    'consultation_hours' => $demoDoctor['consultation_hours'],
                    'license_number' => $demoDoctor['license_number'],
                    'bio' => $demoDoctor['bio'],
                    'verification_status' => 'pending',
                    'verified_at' => null,
                    'verified_by' => null,
                    'license_verified' => false,
                    'license_verified_at' => null,
                    'license_verified_by_doctor_id' => null,
                    'license_verification_notes' => null,
                    'account_status' => 'active',
                ]
            );
        }

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

        $rx = Prescription::updateOrCreate(
            ['print_code' => 'RX-DEMO-0001'],
            [
                'doctor_user_id' => $doctor->id,
                'patient_user_id' => $patient->id,
                'family_member_id' => null,
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
