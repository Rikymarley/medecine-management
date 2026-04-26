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
use App\Http\Controllers\Api\PatientMedicineCabinetController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\LicenseVerificationController;
use App\Http\Controllers\Api\DoctorSpecialtyController;
use App\Http\Controllers\Api\DoctorPatientAccessRequestController;
use App\Http\Controllers\Api\DoctorSecretaryAccessRequestController;
use App\Http\Controllers\Api\DoctorRehabController;
use App\Http\Controllers\Api\DoctorVisitController;
use App\Http\Controllers\Api\UserVerificationController;
use App\Http\Controllers\Api\HospitalController;
use App\Http\Controllers\Api\LaboratoryController;
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
Route::get('/secretaire/secretaires-directory', [AuthController::class, 'secretariesDirectoryForSecretary'])
    ->middleware(['auth:sanctum', 'role:secretaire', 'verified']);

Route::get('/pharmacies', [PharmacyController::class, 'index']);
Route::get('/hospitals', [HospitalController::class, 'index']);
Route::get('/laboratories', [LaboratoryController::class, 'index']);
Route::get('/doctor/pharmacies-directory', [PharmacyController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/pharmacy/pharmacies-directory', [PharmacyController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::get('/doctor/hospitals-directory', [HospitalController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/pharmacy/hospitals-directory', [HospitalController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::get('/doctor/laboratories-directory', [LaboratoryController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/pharmacy/laboratories-directory', [LaboratoryController::class, 'directoryForDoctor'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::post('/pharmacies', [PharmacyController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:admin', 'throttle:30,1']);
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

Route::get('/prescriptions', [PrescriptionController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::get('/doctor/prescriptions', [PrescriptionController::class, 'mine'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients/search', [PrescriptionController::class, 'searchPatients'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients', [DoctorPatientController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/secretaire/patients', [DoctorPatientController::class, 'indexForSecretary'])
    ->middleware(['auth:sanctum', 'role:secretaire', 'verified']);
Route::get('/secretaire/patients/{patient}', [DoctorPatientController::class, 'showForSecretary'])
    ->middleware(['auth:sanctum', 'role:secretaire', 'verified']);
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
Route::get('/doctor/patients/{patient}/access-status', [DoctorPatientAccessRequestController::class, 'status'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/patients/{patient}/access-requests', [DoctorPatientAccessRequestController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/secretaires/search', [DoctorSecretaryAccessRequestController::class, 'search'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/secretaires/access-requests', [DoctorSecretaryAccessRequestController::class, 'doctorIndex'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/secretaires/{secretary}/access-status', [DoctorSecretaryAccessRequestController::class, 'status'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/secretaires/{secretary}/access-requests', [DoctorSecretaryAccessRequestController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);

Route::get('/patient/access-requests', [DoctorPatientAccessRequestController::class, 'patientIndex'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::get('/patient/access-requests/doctors/{doctor}/block-status', [DoctorPatientAccessRequestController::class, 'blockStatus'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/access-requests/doctors/{doctor}/block', [DoctorPatientAccessRequestController::class, 'blockDoctor'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::delete('/patient/access-requests/doctors/{doctor}/block', [DoctorPatientAccessRequestController::class, 'unblockDoctor'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::patch('/patient/access-requests/{accessRequest}', [DoctorPatientAccessRequestController::class, 'respond'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::get('/secretaire/access-requests', [DoctorSecretaryAccessRequestController::class, 'secretaryIndex'])
    ->middleware(['auth:sanctum', 'role:secretaire']);
Route::patch('/secretaire/access-requests/{accessRequest}', [DoctorSecretaryAccessRequestController::class, 'respond'])
    ->middleware(['auth:sanctum', 'role:secretaire']);
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
Route::get('/prescriptions/{prescription}', [PrescriptionController::class, 'show'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);

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
Route::get('/patient/cabinet-items', [PatientMedicineCabinetController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/cabinet-items', [PatientMedicineCabinetController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::patch('/patient/cabinet-items/{cabinetItem}', [PatientMedicineCabinetController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::post('/patient/cabinet-items/{cabinetItem}/photo', [PatientMedicineCabinetController::class, 'uploadPhoto'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:20,1']);
Route::delete('/patient/cabinet-items/{cabinetItem}', [PatientMedicineCabinetController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::get('/patient/emergency-contacts', [EmergencyContactController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/emergency-contacts', [EmergencyContactController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::post('/patient/emergency-contacts/from-profile', [EmergencyContactController::class, 'storeFromProfile'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:60,1']);
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
Route::get('/doctor/visits', [DoctorVisitController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/patient/visits', [DoctorVisitController::class, 'patientIndex'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::get('/doctor/visits/{visit}', [DoctorVisitController::class, 'show'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/visits', [DoctorVisitController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'throttle:30,1']);
Route::put('/doctor/visits/{visit}', [DoctorVisitController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'doctor_license_verified', 'throttle:30,1']);
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
    Route::patch('/secretaire/me', [AuthController::class, 'updateSecretaryProfile'])
        ->middleware(['role:secretaire', 'throttle:30,1']);
    Route::post('/patient/me/profile-photo', [AuthController::class, 'uploadPatientProfilePhoto'])
        ->middleware(['role:patient', 'throttle:20,1']);
    Route::post('/secretaire/me/profile-photo', [AuthController::class, 'uploadSecretaryProfilePhoto'])
        ->middleware(['role:secretaire', 'throttle:20,1']);
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
    Route::get('/hospitals', [AdminAccountController::class, 'hospitals']);
    Route::get('/laboratories', [AdminAccountController::class, 'laboratories']);
    Route::get('/password-reset-events', [AdminAccountController::class, 'passwordResetEvents']);
    Route::post('/users/{user}/approve', [AdminAccountController::class, 'approveUser']);
    Route::post('/users/{user}/unapprove', [AdminAccountController::class, 'unapproveUser']);
    Route::post('/users/{user}/block', [AdminAccountController::class, 'blockUser']);
    Route::post('/users/{user}/unblock', [AdminAccountController::class, 'unblockUser']);
    Route::post('/doctors/{doctor}/verify-license', [AdminAccountController::class, 'verifyDoctorLicense']);
    Route::post('/doctors/{doctor}/verifier-permission', [AdminAccountController::class, 'setDoctorVerifierPermission']);
    Route::post('/pharmacies/{pharmacy}/verify-license', [AdminAccountController::class, 'verifyPharmacyLicense']);
    Route::post('/pharmacy-accounts/{user}/verifier-permission', [AdminAccountController::class, 'setPharmacyVerifierPermission']);
    Route::post('/hospitals/{hospital}/approve', [AdminAccountController::class, 'approveHospital']);
    Route::post('/hospitals/{hospital}/unapprove', [AdminAccountController::class, 'unapproveHospital']);
    Route::post('/hospitals/{hospital}/block', [AdminAccountController::class, 'blockHospital']);
    Route::post('/hospitals/{hospital}/unblock', [AdminAccountController::class, 'unblockHospital']);
    Route::post('/hospitals/{hospital}/verify-license', [AdminAccountController::class, 'verifyHospitalLicense']);
    Route::post('/hospitals/{hospital}/verifier-permission', [AdminAccountController::class, 'setHospitalVerifierPermission']);
    Route::post('/laboratories/{laboratory}/approve', [AdminAccountController::class, 'approveLaboratory']);
    Route::post('/laboratories/{laboratory}/unapprove', [AdminAccountController::class, 'unapproveLaboratory']);
    Route::post('/laboratories/{laboratory}/block', [AdminAccountController::class, 'blockLaboratory']);
    Route::post('/laboratories/{laboratory}/unblock', [AdminAccountController::class, 'unblockLaboratory']);
    Route::post('/laboratories/{laboratory}/verify-license', [AdminAccountController::class, 'verifyLaboratoryLicense']);
    Route::post('/laboratories/{laboratory}/verifier-permission', [AdminAccountController::class, 'setLaboratoryVerifierPermission']);
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
