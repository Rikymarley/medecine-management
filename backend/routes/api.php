<?php

use App\Http\Controllers\Api\PharmacyController;
use App\Http\Controllers\Api\PharmacyResponseController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\FamilyMemberController;
use App\Http\Controllers\Api\GuestPatientController;
use App\Http\Controllers\Api\MedicalHistoryController;
use App\Http\Controllers\Api\PatientMedicinePurchaseController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\UserVerificationController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:8,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::get('/pharmacies', [PharmacyController::class, 'index']);
Route::post('/pharmacies', [PharmacyController::class, 'store']);
Route::get('/pharmacies/{pharmacy}', [PharmacyController::class, 'show']);
Route::get('/pharmacy/me', [PharmacyController::class, 'me'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::patch('/pharmacy/me', [PharmacyController::class, 'updateMe'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:30,1']);
Route::get('/medicines', [MedicineController::class, 'index']);
Route::get('/medicines/{medicine}', [MedicineController::class, 'show']);

Route::get('/prescriptions', [PrescriptionController::class, 'index']);
Route::get('/doctor/prescriptions', [PrescriptionController::class, 'mine'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients/search', [PrescriptionController::class, 'searchPatients'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/guest-patients', [GuestPatientController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/guest-patients/availability', [GuestPatientController::class, 'availability'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::post('/doctor/guest-patients', [GuestPatientController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::patch('/doctor/guest-patients/{guestPatient}', [GuestPatientController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::get('/doctor/prescriptions/{prescription}/print-data', [PrescriptionController::class, 'printDataForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::patch('/doctor/prescriptions/{prescription}/link-patient-by-ninu', [PrescriptionController::class, 'linkPatientByNinu'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::get('/doctor/patients/{patient}', [PrescriptionController::class, 'doctorPatientProfile'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/doctor/patients/{patient}/family-members', [FamilyMemberController::class, 'indexForDoctor'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/patient/prescriptions', [PrescriptionController::class, 'mineForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/prescriptions', [PrescriptionController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::patch('/patient/prescriptions/{prescription}/complete', [PrescriptionController::class, 'completeForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::patch('/patient/prescriptions/{prescription}/reopen', [PrescriptionController::class, 'reopenForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::patch('/patient/prescriptions/{prescription}/family-member', [PrescriptionController::class, 'assignFamilyMemberForPatient'])
    ->middleware(['auth:sanctum', 'role:patient', 'throttle:30,1']);
Route::get('/prescriptions/{prescription}', [PrescriptionController::class, 'show']);

Route::post('/pharmacy-responses', [PharmacyResponseController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified', 'throttle:120,1']);
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
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);
Route::patch('/doctor/patients/{patient}/medical-history/{entry}', [MedicalHistoryController::class, 'doctorUpdate'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified', 'throttle:30,1']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::patch('/doctor/me', [AuthController::class, 'updateDoctorProfile'])
        ->middleware(['role:doctor', 'verified', 'throttle:30,1']);
    Route::patch('/patient/me', [AuthController::class, 'updatePatientProfile'])
        ->middleware(['role:patient', 'throttle:30,1']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('/admin/verifications')->group(function () {
    Route::get('/pending', [UserVerificationController::class, 'pending']);
    Route::post('/{user}/approve', [UserVerificationController::class, 'approve']);
    Route::post('/{user}/reject', [UserVerificationController::class, 'reject']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('/admin/medicines')->group(function () {
    Route::post('/', [MedicineController::class, 'store']);
    Route::put('/{medicine}', [MedicineController::class, 'update']);
    Route::delete('/{medicine}', [MedicineController::class, 'destroy']);
});
