<?php

namespace Tests\Feature;

use App\Models\Pharmacy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LicenseVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_doctor_without_permission_cannot_verify_pharmacy_license(): void
    {
        $doctor = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => true,
            'can_verify_accounts' => false,
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Test',
            'open_now' => true,
            'reliability_score' => 0,
        ]);

        Sanctum::actingAs($doctor);
        $response = $this->postJson("/api/doctor/verifications/pharmacies/{$pharmacy->id}/license", [
            'verified' => true,
        ]);

        $response->assertStatus(403);
    }

    public function test_authorized_doctor_can_verify_pharmacy_license_and_audit_is_saved(): void
    {
        $verifier = User::factory()->create([
            'role' => 'doctor',
            'verification_status' => 'approved',
            'license_verified' => true,
            'can_verify_accounts' => true,
        ]);
        $pharmacy = Pharmacy::create([
            'name' => 'Pharmacie Test',
            'open_now' => true,
            'reliability_score' => 0,
            'license_verified' => false,
        ]);

        Sanctum::actingAs($verifier);
        $response = $this->postJson("/api/doctor/verifications/pharmacies/{$pharmacy->id}/license", [
            'verified' => true,
            'notes' => 'Association valide la licence',
        ]);

        $response->assertOk();
        $response->assertJsonFragment([
            'license_verified' => true,
            'license_verified_by_doctor_id' => $verifier->id,
            'license_verified_by_doctor_name' => $verifier->name,
        ]);

        $this->assertDatabaseHas('pharmacies', [
            'id' => $pharmacy->id,
            'license_verified' => 1,
            'license_verified_by_doctor_id' => $verifier->id,
            'license_verification_notes' => 'Association valide la licence',
        ]);
    }
}
