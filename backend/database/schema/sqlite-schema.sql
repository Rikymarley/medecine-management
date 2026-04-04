CREATE TABLE IF NOT EXISTS "migrations"(
  "id" integer primary key autoincrement not null,
  "migration" varchar not null,
  "batch" integer not null
);
CREATE TABLE IF NOT EXISTS "password_reset_tokens"(
  "email" varchar not null,
  "token" varchar not null,
  "created_at" datetime,
  primary key("email")
);
CREATE TABLE IF NOT EXISTS "sessions"(
  "id" varchar not null,
  "user_id" integer,
  "ip_address" varchar,
  "user_agent" text,
  "payload" text not null,
  "last_activity" integer not null,
  primary key("id")
);
CREATE INDEX "sessions_user_id_index" on "sessions"("user_id");
CREATE INDEX "sessions_last_activity_index" on "sessions"("last_activity");
CREATE TABLE IF NOT EXISTS "cache"(
  "key" varchar not null,
  "value" text not null,
  "expiration" integer not null,
  primary key("key")
);
CREATE INDEX "cache_expiration_index" on "cache"("expiration");
CREATE TABLE IF NOT EXISTS "cache_locks"(
  "key" varchar not null,
  "owner" varchar not null,
  "expiration" integer not null,
  primary key("key")
);
CREATE INDEX "cache_locks_expiration_index" on "cache_locks"("expiration");
CREATE TABLE IF NOT EXISTS "jobs"(
  "id" integer primary key autoincrement not null,
  "queue" varchar not null,
  "payload" text not null,
  "attempts" integer not null,
  "reserved_at" integer,
  "available_at" integer not null,
  "created_at" integer not null
);
CREATE INDEX "jobs_queue_index" on "jobs"("queue");
CREATE TABLE IF NOT EXISTS "job_batches"(
  "id" varchar not null,
  "name" varchar not null,
  "total_jobs" integer not null,
  "pending_jobs" integer not null,
  "failed_jobs" integer not null,
  "failed_job_ids" text not null,
  "options" text,
  "cancelled_at" integer,
  "created_at" integer not null,
  "finished_at" integer,
  primary key("id")
);
CREATE TABLE IF NOT EXISTS "failed_jobs"(
  "id" integer primary key autoincrement not null,
  "uuid" varchar not null,
  "connection" text not null,
  "queue" text not null,
  "payload" text not null,
  "exception" text not null,
  "failed_at" datetime not null default CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "failed_jobs_uuid_unique" on "failed_jobs"("uuid");
CREATE TABLE IF NOT EXISTS "medicine_requests"(
  "id" integer primary key autoincrement not null,
  "prescription_id" integer not null,
  "name" varchar not null,
  "strength" varchar,
  "form" varchar,
  "generic_allowed" tinyint(1) not null default '1',
  "conversion_allowed" tinyint(1) not null default '0',
  "created_at" datetime,
  "updated_at" datetime,
  "quantity" integer not null default '1',
  "expiry_date" date,
  "duration_days" integer,
  "daily_dosage" integer,
  "notes" text,
  foreign key("prescription_id") references "prescriptions"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "pharmacy_responses"(
  "id" integer primary key autoincrement not null,
  "pharmacy_id" integer not null,
  "prescription_id" integer not null,
  "medicine_request_id" integer not null,
  "status" varchar not null,
  "responded_at" datetime not null default CURRENT_TIMESTAMP,
  "expires_at" datetime not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("pharmacy_id") references "pharmacies"("id") on delete cascade,
  foreign key("prescription_id") references "prescriptions"("id") on delete cascade,
  foreign key("medicine_request_id") references "medicine_requests"("id") on delete cascade
);
CREATE INDEX "pharmacy_responses_pharmacy_id_prescription_id_index" on "pharmacy_responses"(
  "pharmacy_id",
  "prescription_id"
);
CREATE TABLE IF NOT EXISTS "personal_access_tokens"(
  "id" integer primary key autoincrement not null,
  "tokenable_type" varchar not null,
  "tokenable_id" integer not null,
  "name" text not null,
  "token" varchar not null,
  "abilities" text,
  "last_used_at" datetime,
  "expires_at" datetime,
  "created_at" datetime,
  "updated_at" datetime
);
CREATE INDEX "personal_access_tokens_tokenable_type_tokenable_id_index" on "personal_access_tokens"(
  "tokenable_type",
  "tokenable_id"
);
CREATE UNIQUE INDEX "personal_access_tokens_token_unique" on "personal_access_tokens"(
  "token"
);
CREATE INDEX "personal_access_tokens_expires_at_index" on "personal_access_tokens"(
  "expires_at"
);
CREATE TABLE IF NOT EXISTS "patient_medicine_purchases"(
  "id" integer primary key autoincrement not null,
  "patient_user_id" integer not null,
  "prescription_id" integer not null,
  "medicine_request_id" integer not null,
  "pharmacy_id" integer not null,
  "created_at" datetime,
  "updated_at" datetime,
  "quantity" integer not null default '1',
  foreign key("patient_user_id") references "users"("id") on delete cascade,
  foreign key("prescription_id") references "prescriptions"("id") on delete cascade,
  foreign key("medicine_request_id") references "medicine_requests"("id") on delete cascade,
  foreign key("pharmacy_id") references "pharmacies"("id") on delete cascade
);
CREATE UNIQUE INDEX "patient_purchase_unique" on "patient_medicine_purchases"(
  "patient_user_id",
  "prescription_id",
  "medicine_request_id",
  "pharmacy_id"
);
CREATE TABLE IF NOT EXISTS "medicines"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "generic_name" varchar,
  "strength" varchar,
  "form" varchar,
  "category" varchar check("category" in('standard', 'complementaire', 'supplementaire')) not null default 'standard',
  "is_active" tinyint(1) not null default '1',
  "notes" text,
  "created_at" datetime,
  "updated_at" datetime
);
CREATE INDEX "medicines_category_is_active_index" on "medicines"(
  "category",
  "is_active"
);
CREATE INDEX "medicines_name_index" on "medicines"("name");
CREATE TABLE IF NOT EXISTS "emergency_contacts"(
  "id" integer primary key autoincrement not null,
  "patient_user_id" integer not null,
  "name" varchar not null,
  "phone" varchar not null,
  "category" varchar not null default 'clinic',
  "city" varchar,
  "department" varchar,
  "address" varchar,
  "is_24_7" tinyint(1) not null default '0',
  "is_favorite" tinyint(1) not null default '0',
  "notes" text,
  "created_at" datetime,
  "updated_at" datetime,
  "available_hours" varchar,
  "priority" integer,
  foreign key("patient_user_id") references "users"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "family_members"(
  "id" integer primary key autoincrement not null,
  "patient_user_id" integer not null,
  "name" varchar not null,
  "age" integer,
  "gender" varchar,
  "relationship" varchar,
  "created_at" datetime,
  "updated_at" datetime,
  "allergies" varchar,
  "chronic_diseases" varchar,
  "blood_type" varchar,
  "emergency_notes" text,
  "primary_caregiver" tinyint(1) not null default '0',
  "date_of_birth" date,
  "weight_kg" numeric,
  "height_cm" numeric,
  "surgical_history" text,
  "vaccination_up_to_date" tinyint(1),
  foreign key("patient_user_id") references "users"("id") on delete cascade
);
CREATE TABLE IF NOT EXISTS "prescription_status_logs"(
  "id" integer primary key autoincrement not null,
  "prescription_id" integer not null,
  "old_status" varchar,
  "new_status" varchar not null,
  "changed_by_user_id" integer,
  "reason" varchar,
  "metadata" text,
  "changed_at" datetime not null default CURRENT_TIMESTAMP,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("prescription_id") references "prescriptions"("id") on delete cascade,
  foreign key("changed_by_user_id") references "users"("id") on delete set null
);
CREATE INDEX "prescription_status_logs_prescription_id_changed_at_index" on "prescription_status_logs"(
  "prescription_id",
  "changed_at"
);
CREATE INDEX "emergency_contacts_patient_user_id_priority_index" on "emergency_contacts"(
  "patient_user_id",
  "priority"
);
CREATE TABLE IF NOT EXISTS "prescriptions"(
  "id" integer primary key autoincrement not null,
  "patient_name" varchar not null,
  "doctor_name" varchar not null,
  "status" varchar not null default('pending'),
  "requested_at" datetime not null default(CURRENT_TIMESTAMP),
  "created_at" datetime,
  "updated_at" datetime,
  "doctor_user_id" integer,
  "patient_user_id" integer,
  "family_member_id" integer,
  "source" varchar not null default('app'),
  "patient_phone" varchar,
  "claim_token" varchar,
  "claim_expires_at" datetime,
  "qr_token" varchar,
  "print_code" varchar,
  "printed_at" datetime,
  "print_count" integer not null default('0'),
  foreign key("family_member_id") references family_members("id") on delete set null on update no action,
  foreign key("doctor_user_id") references users("id") on delete set null on update no action,
  foreign key("patient_user_id") references users("id") on delete set null on update no action
);
CREATE INDEX "prescriptions_doctor_user_id_requested_at_index" on "prescriptions"(
  "doctor_user_id",
  "requested_at"
);
CREATE INDEX "prescriptions_family_member_id_index" on "prescriptions"(
  "family_member_id"
);
CREATE INDEX "prescriptions_patient_user_id_requested_at_index" on "prescriptions"(
  "patient_user_id",
  "requested_at"
);
CREATE UNIQUE INDEX "prescriptions_print_code_unique" on "prescriptions"(
  "print_code"
);
CREATE INDEX "prescriptions_requested_at_index" on "prescriptions"(
  "requested_at"
);
CREATE INDEX "prescriptions_status_index" on "prescriptions"("status");
CREATE TABLE IF NOT EXISTS "medical_history_entries"(
  "id" integer primary key autoincrement not null,
  "patient_user_id" integer not null,
  "family_member_id" integer,
  "doctor_user_id" integer,
  "type" varchar not null,
  "title" varchar not null,
  "details" text,
  "started_at" date,
  "ended_at" date,
  "status" varchar not null default('active'),
  "visibility" varchar not null default('shared'),
  "created_at" datetime,
  "updated_at" datetime,
  "prescription_id" integer,
  "entry_code" varchar,
  foreign key("doctor_user_id") references users("id") on delete set null on update no action,
  foreign key("family_member_id") references family_members("id") on delete set null on update no action,
  foreign key("patient_user_id") references users("id") on delete cascade on update no action,
  foreign key("prescription_id") references "prescriptions"("id") on delete set null
);
CREATE INDEX "medical_history_entries_patient_user_id_family_member_id_index" on "medical_history_entries"(
  "patient_user_id",
  "family_member_id"
);
CREATE INDEX "medical_history_entries_patient_user_id_status_index" on "medical_history_entries"(
  "patient_user_id",
  "status"
);
CREATE INDEX "medical_history_entries_patient_user_id_type_index" on "medical_history_entries"(
  "patient_user_id",
  "type"
);
CREATE INDEX "medical_history_entries_patient_user_id_prescription_id_index" on "medical_history_entries"(
  "patient_user_id",
  "prescription_id"
);
CREATE UNIQUE INDEX "medical_history_entries_entry_code_unique" on "medical_history_entries"(
  "entry_code"
);
CREATE TABLE IF NOT EXISTS "medical_history_entry_prescriptions"(
  "id" integer primary key autoincrement not null,
  "medical_history_entry_id" integer not null,
  "prescription_id" integer not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("medical_history_entry_id") references "medical_history_entries"("id") on delete cascade,
  foreign key("prescription_id") references "prescriptions"("id") on delete cascade
);
CREATE UNIQUE INDEX "mh_entry_rx_unique" on "medical_history_entry_prescriptions"(
  "medical_history_entry_id",
  "prescription_id"
);
CREATE TABLE IF NOT EXISTS "users"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "email" varchar not null,
  "email_verified_at" datetime,
  "password" varchar not null,
  "remember_token" varchar,
  "created_at" datetime,
  "updated_at" datetime,
  "role" varchar not null default('patient'),
  "pharmacy_id" integer,
  "verification_status" varchar not null default('approved'),
  "verified_at" datetime,
  "verified_by" integer,
  "verification_notes" text,
  "phone" varchar,
  "address" varchar,
  "latitude" numeric,
  "longitude" numeric,
  "specialty" varchar,
  "city" varchar,
  "department" varchar,
  "languages" varchar,
  "teleconsultation_available" tinyint(1) not null default('0'),
  "consultation_hours" text,
  "license_number" varchar,
  "license_verified" tinyint(1) not null default('0'),
  "years_experience" integer,
  "consultation_fee_range" varchar,
  "whatsapp" varchar,
  "bio" text,
  "age" integer,
  "gender" varchar,
  "allergies" varchar,
  "chronic_diseases" varchar,
  "blood_type" varchar,
  "emergency_notes" text,
  "ninu" varchar,
  "account_status" varchar not null default('active'),
  "created_by_doctor_id" integer,
  "date_of_birth" date,
  "weight_kg" numeric,
  "height_cm" numeric,
  "surgical_history" text,
  "vaccination_up_to_date" tinyint(1),
  "can_verify_accounts" tinyint(1) not null default '0',
  "license_verified_at" datetime,
  "license_verified_by_doctor_id" integer,
  "license_verification_notes" text,
  foreign key("created_by_doctor_id") references users("id") on delete set null on update no action,
  foreign key("pharmacy_id") references pharmacies("id") on delete set null on update no action,
  foreign key("verified_by") references users("id") on delete set null on update no action,
  foreign key("license_verified_by_doctor_id") references "users"("id") on delete set null
);
CREATE INDEX "users_created_by_doctor_id_account_status_index" on "users"(
  "created_by_doctor_id",
  "account_status"
);
CREATE UNIQUE INDEX "users_email_unique" on "users"("email");
CREATE UNIQUE INDEX "users_ninu_unique" on "users"("ninu");
CREATE UNIQUE INDEX "users_pharmacy_id_unique" on "users"("pharmacy_id");
CREATE INDEX "users_role_account_status_index" on "users"(
  "role",
  "account_status"
);
CREATE TABLE IF NOT EXISTS "pharmacies"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "phone" varchar,
  "address" varchar,
  "latitude" numeric,
  "longitude" numeric,
  "open_now" tinyint(1) not null default('1'),
  "reliability_score" integer not null default('0'),
  "created_at" datetime,
  "updated_at" datetime,
  "opening_hours" text,
  "closes_at" varchar,
  "temporary_closed" tinyint(1) not null default('0'),
  "emergency_available" tinyint(1) not null default('0'),
  "last_status_updated_at" datetime,
  "services" text,
  "payment_methods" text,
  "price_range" varchar,
  "average_wait_time" integer,
  "delivery_available" tinyint(1) not null default('0'),
  "delivery_radius_km" numeric,
  "night_service" tinyint(1) not null default('0'),
  "license_number" varchar,
  "license_verified" tinyint(1) not null default('0'),
  "logo_url" varchar,
  "storefront_image_url" varchar,
  "notes_for_patients" varchar,
  "last_confirmed_stock_time" datetime,
  "pharmacy_mode" varchar not null default('quick_manual'),
  "license_verified_at" datetime,
  "license_verified_by_doctor_id" integer,
  "license_verification_notes" text,
  foreign key("license_verified_by_doctor_id") references "users"("id") on delete set null
);

INSERT INTO migrations VALUES(1,'0001_01_01_000000_create_users_table',1);
INSERT INTO migrations VALUES(2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO migrations VALUES(3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO migrations VALUES(4,'2026_03_30_131731_create_pharmacies_table',2);
INSERT INTO migrations VALUES(5,'2026_03_30_131738_create_prescriptions_table',2);
INSERT INTO migrations VALUES(6,'2026_03_30_131743_create_medicine_requests_table',2);
INSERT INTO migrations VALUES(7,'2026_03_30_131746_create_pharmacy_responses_table',2);
INSERT INTO migrations VALUES(8,'2026_03_30_132748_create_personal_access_tokens_table',3);
INSERT INTO migrations VALUES(9,'2026_03_30_132752_add_role_and_pharmacy_id_to_users_table',3);
INSERT INTO migrations VALUES(10,'2026_03_30_174833_add_unique_index_to_users_pharmacy_id',4);
INSERT INTO migrations VALUES(11,'2026_03_30_210000_add_verification_fields_to_users_table',5);
INSERT INTO migrations VALUES(12,'2026_03_30_220000_create_patient_medicine_purchases_table',6);
INSERT INTO migrations VALUES(13,'2026_03_30_223000_add_quantity_to_patient_medicine_purchases_table',7);
INSERT INTO migrations VALUES(14,'2026_03_30_231000_create_medicines_table',8);
INSERT INTO migrations VALUES(15,'2026_03_30_234000_add_quantity_to_medicine_requests_table',9);
INSERT INTO migrations VALUES(16,'2026_03_30_235000_create_emergency_contacts_table',10);
INSERT INTO migrations VALUES(17,'2026_03_31_000000_create_family_members_table',11);
INSERT INTO migrations VALUES(18,'2026_03_31_010000_add_owner_ids_to_prescriptions_table',12);
INSERT INTO migrations VALUES(19,'2026_03_31_011000_create_prescription_status_logs_table',13);
INSERT INTO migrations VALUES(20,'2026_03_31_012000_add_requested_at_index_to_prescriptions_table',14);
INSERT INTO migrations VALUES(21,'2026_03_31_013000_add_medical_profile_to_family_members_table',15);
INSERT INTO migrations VALUES(22,'2026_03_31_013100_add_family_member_to_prescriptions_table',15);
INSERT INTO migrations VALUES(23,'2026_03_31_013200_add_hours_and_priority_to_emergency_contacts_table',15);
INSERT INTO migrations VALUES(24,'2026_03_31_020000_add_schedule_fields_to_medicine_requests_table',16);
INSERT INTO migrations VALUES(25,'2026_04_01_000100_add_availability_fields_to_pharmacies_table',17);
INSERT INTO migrations VALUES(26,'2026_04_01_010000_create_medical_history_entries_table',18);
INSERT INTO migrations VALUES(27,'2026_04_01_153042_add_contact_fields_to_users_table',19);
INSERT INTO migrations VALUES(28,'2026_04_01_154322_add_doctor_profile_fields_to_users_table',20);
INSERT INTO migrations VALUES(29,'2026_04_01_172652_add_profile_fields_to_pharmacies_table',21);
INSERT INTO migrations VALUES(30,'2026_04_01_183015_add_medical_profile_fields_to_users_table',22);
INSERT INTO migrations VALUES(31,'2026_04_01_184001_add_pharmacy_mode_to_pharmacies_table',23);
INSERT INTO migrations VALUES(32,'2026_04_01_210000_add_print_fields_to_prescriptions_table',24);
INSERT INTO migrations VALUES(33,'2026_04_01_221000_add_prescription_id_to_medical_history_entries_table',26);
INSERT INTO migrations VALUES(34,'2026_04_01_223000_add_ninu_to_users_table',27);
INSERT INTO migrations VALUES(35,'2026_04_02_090000_add_provisional_fields_to_users_table',28);
INSERT INTO migrations VALUES(36,'2026_04_02_110000_add_date_of_birth_to_users_table',29);
INSERT INTO migrations VALUES(37,'2026_04_02_120000_promote_provisional_patients_to_active',30);
INSERT INTO migrations VALUES(38,'2026_04_02_130000_add_entry_code_to_medical_history_entries_table',31);
INSERT INTO migrations VALUES(39,'2026_04_02_140000_create_medical_history_entry_prescriptions_table',32);
INSERT INTO migrations VALUES(40,'2026_04_02_231000_add_pharmacy_mode_column_to_pharmacies_table',33);
INSERT INTO migrations VALUES(41,'2026_04_03_090000_add_date_of_birth_to_family_members_table',34);
INSERT INTO migrations VALUES(42,'2026_04_03_103000_add_extended_medical_profile_fields_to_users_and_family_members',35);
INSERT INTO migrations VALUES(43,'2026_04_03_120000_create_users_table_consolidated',36);
INSERT INTO migrations VALUES(44,'2026_04_03_121000_create_pharmacies_table_consolidated',36);
INSERT INTO migrations VALUES(45,'2026_04_03_122000_create_prescriptions_table_consolidated',36);
INSERT INTO migrations VALUES(46,'2026_04_03_123000_create_medicine_requests_table_consolidated',36);
INSERT INTO migrations VALUES(47,'2026_04_03_124000_create_family_members_table_consolidated',36);
INSERT INTO migrations VALUES(48,'2026_04_03_125000_create_emergency_contacts_table_consolidated',36);
INSERT INTO migrations VALUES(49,'2026_04_03_130000_create_medical_history_entries_table_consolidated',36);
INSERT INTO migrations VALUES(50,'2026_04_03_131000_create_patient_medicine_purchases_table_consolidated',36);
INSERT INTO migrations VALUES(51,'2026_04_03_132000_create_pharmacy_responses_table_consolidated',36);
INSERT INTO migrations VALUES(52,'2026_04_03_133000_create_medicines_table_consolidated',36);
INSERT INTO migrations VALUES(53,'2026_04_03_135000_create_prescription_status_logs_table_consolidated',36);
INSERT INTO migrations VALUES(54,'2026_04_03_141000_add_license_verifier_fields',37);
