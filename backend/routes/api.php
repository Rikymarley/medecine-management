<?php

use App\Http\Controllers\Api\PharmacyController;
use App\Http\Controllers\Api\PharmacyResponseController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\AdminAccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\FamilyMemberController;
use App\Http\Controllers\Api\DoctorPatientController;
use App\Http\Controllers\Api\MedicalHistoryController;
use App\Http\Controllers\Api\PatientMedicinePurchaseController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\LicenseVerificationController;
use App\Http\Controllers\Api\DoctorSpecialtyController;
use App\Http\Controllers\Api\DoctorRehabController;
use App\Http\Controllers\Api\UserVerificationController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:8,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/password-reset/request-whatsapp', [AuthController::class, 'requestPasswordResetWhatsappLink'])->middleware('throttle:5,1');
Route::post('/auth/password-reset/recovery/resolve', [AuthController::class, 'resolveRecoveryApprovalToken'])->middleware('throttle:20,1');
Route::post('/auth/password-reset/recovery/decision', [AuthController::class, 'decideRecoveryApproval'])->middleware('throttle:20,1');
Route::post('/auth/password-reset/resolve', [AuthController::class, 'resolvePasswordResetToken'])->middleware('throttle:20,1');
Route::post('/auth/password-reset/complete', [AuthController::class, 'completePasswordReset'])->middleware('throttle:10,1');
Route::post('/auth/claim/resolve', [AuthController::class, 'resolveClaimToken'])->middleware('throttle:30,1');
Route::post('/auth/claim/complete', [AuthController::class, 'claimFamilyMemberAccount'])->middleware('throttle:20,1');
Route::get('/doctor-specialties', [DoctorSpecialtyController::class, 'index']);
Route::get('/doctors', [AuthController::class, 'doctorsDirectory']);
Route::get('/doctor/doctors-directory', [AuthController::class, 'doctorsDirectoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/pharmacy/doctors-directory', [AuthController::class, 'doctorsDirectoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);

Route::get('/pharmacies', [PharmacyController::class, 'index']);
Route::get('/doctor/pharmacies-directory', [PharmacyController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/pharmacy/pharmacies-directory', [PharmacyController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::post('/pharmacies', [PharmacyController::class, 'store']);
Route::get('/pharmacies/{pharmacy}', [PharmacyController::class, 'show']);
Route::get('/pharmacy/me', [PharmacyController::class, 'me'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::patch('/pharmacy/me', [PharmacyController::class, 'updateMe'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:30,1']);
Route::post('/pharmacy/me/logo', [PharmacyController::class, 'uploadLogo'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:20,1']);
Route::post('/pharmacy/me/storefront-image', [PharmacyController::class, 'uploadStorefrontImage'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:20,1']);
Route::get('/medicines', [MedicineController::class, 'index']);
Route::get('/medicines/{medicine}', [MedicineController::class, 'show']);

Route::get('/prescriptions', [PrescriptionController::class, 'index']);
Route::get('/doctor/prescriptions', [PrescriptionController::class, 'mine'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients/search', [PrescriptionController::class, 'searchPatients'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients', [DoctorPatientController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients/availability', [DoctorPatientController::class, 'availability'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/patients', [DoctorPatientController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::patch('/doctor/patients/{patient}/basic', [DoctorPatientController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::get('/doctor/prescriptions/{prescription}/print-data', [PrescriptionController::class, 'printDataForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::patch('/doctor/prescriptions/{prescription}/link-patient-by-ninu', [PrescriptionController::class, 'linkPatientByNinu'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::post('/doctor/prescriptions/{prescription}/create-and-link-patient', [PrescriptionController::class, 'createAndLinkPatient'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::get('/doctor/patients/{patient}', [PrescriptionController::class, 'doctorPatientProfile'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients/{patient}/family-members', [FamilyMemberController::class, 'indexForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/patient/prescriptions', [PrescriptionController::class, 'mineForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/prescriptions', [PrescriptionController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'throttle:30,1']);
Route::patch('/patient/prescriptions/{prescription}/complete', [PrescriptionController::class, 'completeForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::patch('/patient/prescriptions/{prescription}/reopen', [PrescriptionController::class, 'reopenForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::patch('/patient/prescriptions/{prescription}/family-member', [PrescriptionController::class, 'assignFamilyMemberForPatient'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::get('/prescriptions/{prescription}', [PrescriptionController::class, 'show']);

Route::post('/pharmacy-responses', [PharmacyResponseController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:120,1']);
Route::patch('/pharmacy/prescriptions/{prescription}/reactivate', [PrescriptionController::class, 'reactivateForPharmacy'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:30,1']);
Route::get('/patient/prescriptions/{prescription}/purchases', [PatientMedicinePurchaseController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/prescriptions/{prescription}/purchases', [PatientMedicinePurchaseController::class, 'upsert'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:180,1']);
Route::post('/patient/prescriptions/{prescription}/purchases/batch', [PatientMedicinePurchaseController::class, 'upsertBatch'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:60,1']);
Route::get('/patient/emergency-contacts', [EmergencyContactController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/emergency-contacts', [EmergencyContactController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::patch('/patient/emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::delete('/patient/emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::get('/patient/family-members', [FamilyMemberController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/family-members', [FamilyMemberController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::patch('/patient/family-members/{familyMember}', [FamilyMemberController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::post('/patient/family-members/{familyMember}/photo', [FamilyMemberController::class, 'uploadPhoto'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:20,1']);
Route::delete('/patient/family-members/{familyMember}/photo', [FamilyMemberController::class, 'removePhoto'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:20,1']);
Route::post('/patient/family-members/{familyMember}/id-document', [FamilyMemberController::class, 'uploadIdDocument'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:20,1']);
Route::delete('/patient/family-members/{familyMember}/id-document', [FamilyMemberController::class, 'removeIdDocument'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:20,1']);
Route::patch('/patient/family-members/{familyMember}/unarchive', [FamilyMemberController::class, 'unarchive'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::delete('/patient/family-members/{familyMember}', [FamilyMemberController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::get('/patient/medical-history', [MedicalHistoryController::class, 'patientIndex'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/medical-history', [MedicalHistoryController::class, 'patientStore'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::patch('/patient/medical-history/{entry}', [MedicalHistoryController::class, 'patientUpdate'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::delete('/patient/medical-history/{entry}', [MedicalHistoryController::class, 'patientDestroy'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::get('/doctor/patients/{patient}/medical-history', [MedicalHistoryController::class, 'doctorIndex'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/patients/{patient}/medical-history', [MedicalHistoryController::class, 'doctorStore'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'throttle:30,1']);
Route::patch('/doctor/patients/{patient}/medical-history/{entry}', [MedicalHistoryController::class, 'doctorUpdate'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::patch('/doctor/patients/{patient}/medical-history/{entry}/link-prescription', [MedicalHistoryController::class, 'doctorLinkPrescription'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::get('/doctor/patients/{patient}/rehab-entries', [DoctorRehabController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/patients/{patient}/rehab-entries', [DoctorRehabController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'throttle:30,1']);
Route::patch('/doctor/patients/{patient}/rehab-entries/{entry}', [DoctorRehabController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'throttle:30,1']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::patch('/auth/change-password', [AuthController::class, 'changePassword'])
        ->middleware('throttle:30,1');
    Route::patch('/auth/recovery-whatsapp', [AuthController::class, 'updateRecoveryWhatsapp'])
        ->middleware('throttle:30,1');
    Route::patch('/doctor/me', [AuthController::class, 'updateDoctorProfile'])
        ->middleware(['role:doctor', 'verified', 'throttle:30,1']);
    Route::post('/doctor/me/profile-photo', [AuthController::class, 'uploadDoctorProfilePhoto'])
        ->middleware(['role:doctor', 'verified', 'throttle:20,1']);
    Route::post('/doctor/me/profile-banner', [AuthController::class, 'uploadDoctorBanner'])
        ->middleware(['role:doctor', 'verified', 'throttle:20,1']);
    Route::patch('/patient/me', [AuthController::class, 'updatePatientProfile'])
        ->middleware(['role:patient', 'throttle:30,1']);
    Route::post('/patient/me/profile-photo', [AuthController::class, 'uploadPatientProfilePhoto'])
        ->middleware(['role:patient', 'throttle:20,1']);
    Route::post('/patient/me/id-document', [AuthController::class, 'uploadPatientIdDocument'])
        ->middleware(['role:patient', 'throttle:20,1']);
    Route::delete('/patient/me/id-document', [AuthController::class, 'removePatientIdDocument'])
        ->middleware(['role:patient', 'throttle:20,1']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('/admin/verifications')->group(function () {
    Route::get('/pending', [UserVerificationController::class, 'pending']);
    Route::post('/{user}/approve', [UserVerificationController::class, 'approve']);
    Route::post('/{user}/reject', [UserVerificationController::class, 'reject']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('/admin/accounts')->group(function () {
    Route::get('/users', [AdminAccountController::class, 'users']);
    Route::get('/pharmacies', [AdminAccountController::class, 'pharmacies']);
    Route::get('/password-reset-events', [AdminAccountController::class, 'passwordResetEvents']);
    Route::post('/users/{user}/approve', [AdminAccountController::class, 'approveUser']);
    Route::post('/users/{user}/unapprove', [AdminAccountController::class, 'unapproveUser']);
    Route::post('/users/{user}/block', [AdminAccountController::class, 'blockUser']);
    Route::post('/users/{user}/unblock', [AdminAccountController::class, 'unblockUser']);
    Route::post('/doctors/{doctor}/verify-license', [AdminAccountController::class, 'verifyDoctorLicense']);
    Route::post('/doctors/{doctor}/verifier-permission', [AdminAccountController::class, 'setDoctorVerifierPermission']);
    Route::post('/pharmacies/{pharmacy}/verify-license', [AdminAccountController::class, 'verifyPharmacyLicense']);
    Route::post('/pharmacy-accounts/{user}/verifier-permission', [AdminAccountController::class, 'setPharmacyVerifierPermission']);
});

Route::middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'can_verify_accounts'])
    ->prefix('/doctor/verifications')
    ->group(function () {
        Route::post('/doctors/{doctor}/license', [LicenseVerificationController::class, 'verifyDoctor']);
        Route::post('/pharmacies/{pharmacy}/license', [LicenseVerificationController::class, 'verifyPharmacy']);
        Route::post('/doctor-accounts/{user}/approve', [LicenseVerificationController::class, 'approveDoctorAccount']);
        Route::post('/doctor-accounts/{user}/unapprove', [LicenseVerificationController::class, 'unapproveDoctorAccount']);
        Route::post('/pharmacy-accounts/{user}/approve', [LicenseVerificationController::class, 'approvePharmacyAccount']);
        Route::post('/pharmacy-accounts/{user}/unapprove', [LicenseVerificationController::class, 'unapprovePharmacyAccount']);
    });

Route::middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'can_verify_accounts'])
    ->prefix('/pharmacy/verifications')
    ->group(function () {
        Route::post('/doctors/{doctor}/license', [LicenseVerificationController::class, 'verifyDoctor']);
        Route::post('/pharmacies/{pharmacy}/license', [LicenseVerificationController::class, 'verifyPharmacy']);
        Route::post('/doctor-accounts/{user}/approve', [LicenseVerificationController::class, 'approveDoctorAccount']);
        Route::post('/doctor-accounts/{user}/unapprove', [LicenseVerificationController::class, 'unapproveDoctorAccount']);
        Route::post('/pharmacy-accounts/{user}/approve', [LicenseVerificationController::class, 'approvePharmacyAccount']);
        Route::post('/pharmacy-accounts/{user}/unapprove', [LicenseVerificationController::class, 'unapprovePharmacyAccount']);
    });

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('/admin/medicines')->group(function () {
    Route::post('/', [MedicineController::class, 'store']);
    Route::put('/{medicine}', [MedicineController::class, 'update']);
    Route::delete('/{medicine}', [MedicineController::class, 'destroy']);
});
