<?php

use App\Http\Controllers\Api\PharmacyController;
use App\Http\Controllers\Api\PharmacyResponseController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\PatientMedicinePurchaseController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\UserVerificationController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/pharmacies', [PharmacyController::class, 'index']);
Route::post('/pharmacies', [PharmacyController::class, 'store']);
Route::get('/pharmacies/{pharmacy}', [PharmacyController::class, 'show']);
Route::get('/medicines', [MedicineController::class, 'index']);
Route::get('/medicines/{medicine}', [MedicineController::class, 'show']);

Route::get('/prescriptions', [PrescriptionController::class, 'index']);
Route::get('/doctor/prescriptions', [PrescriptionController::class, 'mine'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::get('/patient/prescriptions', [PrescriptionController::class, 'mineForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/prescriptions', [PrescriptionController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:doctor', 'verified']);
Route::patch('/patient/prescriptions/{prescription}/complete', [PrescriptionController::class, 'completeForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::patch('/patient/prescriptions/{prescription}/reopen', [PrescriptionController::class, 'reopenForPatient'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::get('/prescriptions/{prescription}', [PrescriptionController::class, 'show']);

Route::post('/pharmacy-responses', [PharmacyResponseController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:pharmacy', 'verified']);
Route::get('/patient/prescriptions/{prescription}/purchases', [PatientMedicinePurchaseController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/prescriptions/{prescription}/purchases', [PatientMedicinePurchaseController::class, 'upsert'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/prescriptions/{prescription}/purchases/batch', [PatientMedicinePurchaseController::class, 'upsertBatch'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::get('/patient/emergency-contacts', [EmergencyContactController::class, 'index'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::post('/patient/emergency-contacts', [EmergencyContactController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:patient']);
Route::delete('/patient/emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'role:patient']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
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
