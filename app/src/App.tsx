import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonContent, IonPage, IonRouterOutlet, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { beaker, businessOutline, personCircleOutline } from 'ionicons/icons';
import { AuthProvider, useAuth } from './state/AuthState';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ClaimAccountPage = lazy(() => import('./pages/ClaimAccountPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const RecoveryApprovalPage = lazy(() => import('./pages/RecoveryApprovalPage'));
const PasswordRecoveryRequestPage = lazy(() => import('./pages/PasswordRecoveryRequestPage'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const DoctorCreatePrescriptionPage = lazy(() => import('./pages/DoctorCreatePrescriptionPage'));
const DoctorPrescriptionDetailPage = lazy(() => import('./pages/DoctorPrescriptionDetailPage'));
const DoctorPatientPrescriptionsPage = lazy(() => import('./pages/DoctorPatientPrescriptionsPage'));
const DoctorVisitFormPage = lazy(() => import('./pages/DoctorVisitFormPage'));
const DoctorMyVisitsPage = lazy(() => import('./pages/DoctorMyVisitsPage'));
const DoctorMyAppointmentsPage = lazy(() => import('./pages/DoctorMyAppointmentsPage'));
const PharmacyDashboard = lazy(() => import('./pages/PharmacyDashboard'));
const PharmacyPrescriptionsPage = lazy(() => import('./pages/PharmacyPrescriptionsPage'));
const PharmacyPosHomePage = lazy(() => import('./pages/PharmacyPosHomePage'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorPatientsPage = lazy(() => import('./pages/DoctorPatientsPage'));
const DoctorPrescriptionsPage = lazy(() => import('./pages/DoctorPrescriptionsPage'));
const DoctorDoctorsDirectoryPage = lazy(() => import('./pages/DoctorDoctorsDirectoryPage'));
const DoctorDoctorDetailPage = lazy(() => import('./pages/DoctorDoctorDetailPage'));
const DoctorSecretariesPage = lazy(() => import('./pages/DoctorSecretariesPage'));
const DoctorSecretaryDetailPage = lazy(() => import('./pages/DoctorSecretaryDetailPage'));
const DoctorLaboratoriesDirectoryPage = lazy(() => import('./pages/DoctorLaboratoriesDirectoryPage'));
const DoctorHospitalsDirectoryPage = lazy(() => import('./pages/DoctorHospitalsDirectoryPage'));
const DoctorLaboratoryDetailPage = lazy(() => import('./pages/DoctorLaboratoryDetailPage'));
const DoctorHospitalDetailPage = lazy(() => import('./pages/DoctorHospitalDetailPage'));
const DoctorPharmaciesDirectoryPage = lazy(() => import('./pages/DoctorPharmaciesDirectoryPage'));
const DoctorPharmacyDetailPage = lazy(() => import('./pages/DoctorPharmacyDetailPage'));
const DoctorMedicalHistoryEntryPage = lazy(() => import('./pages/DoctorMedicalHistoryEntryPage'));
const DoctorVisitDetailPage = lazy(() => import('./pages/DoctorVisitDetailPage'));
const PharmacyDoctorsDirectoryPage = lazy(() => import('./pages/PharmacyDoctorsDirectoryPage'));
const PharmacyDoctorDetailPage = lazy(() => import('./pages/PharmacyDoctorDetailPage'));
const PharmacyLaboratoriesDirectoryPage = lazy(() => import('./pages/PharmacyLaboratoriesDirectoryPage'));
const PharmacyHospitalsDirectoryPage = lazy(() => import('./pages/PharmacyHospitalsDirectoryPage'));
const PharmacyLaboratoryDetailPage = lazy(() => import('./pages/PharmacyLaboratoryDetailPage'));
const PharmacyHospitalDetailPage = lazy(() => import('./pages/PharmacyHospitalDetailPage'));
const PharmacyPharmaciesDirectoryPage = lazy(() => import('./pages/PharmacyPharmaciesDirectoryPage'));
const PharmacyPharmacyDetailPage = lazy(() => import('./pages/PharmacyPharmacyDetailPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminDoctorsPage = lazy(() => import('./pages/AdminDoctorsPage'));
const AdminDoctorDetailPage = lazy(() => import('./pages/AdminDoctorDetailPage'));
const AdminHospitalsPage = lazy(() => import('./pages/AdminHospitalsPage'));
const AdminLaboratoriesPage = lazy(() => import('./pages/AdminLaboratoriesPage'));
const AdminHospitalDetailPage = lazy(() => import('./pages/AdminHospitalDetailPage'));
const AdminLaboratoryDetailPage = lazy(() => import('./pages/AdminLaboratoryDetailPage'));
const AdminPharmaciesPage = lazy(() => import('./pages/AdminPharmaciesPage'));
const AdminPharmacyDetailPage = lazy(() => import('./pages/AdminPharmacyDetailPage'));
const AdminPatientsPage = lazy(() => import('./pages/AdminPatientsPage'));
const AdminPatientDetailPage = lazy(() => import('./pages/AdminPatientDetailPage'));
const AdminPasswordResetLogsPage = lazy(() => import('./pages/AdminPasswordResetLogsPage'));
const AdminRoleAccountsPage = lazy(() => import('./pages/AdminRoleAccountsPage'));
const PatientDoctorsPage = lazy(() => import('./pages/PatientDoctorsPage'));
const PatientHospitalsPage = lazy(() => import('./pages/PatientHospitalsPage'));
const PatientLaboratoriesPage = lazy(() => import('./pages/PatientLaboratoriesPage'));
const PatientHospitalDetailPage = lazy(() => import('./pages/PatientHospitalDetailPage'));
const PatientLaboratoryDetailPage = lazy(() => import('./pages/PatientLaboratoryDetailPage'));
const PatientPharmaciesPage = lazy(() => import('./pages/PatientPharmaciesPage'));
const PatientPharmacyDetailPage = lazy(() => import('./pages/PatientPharmacyDetailPage'));
const PatientDoctorPrescriptionsPage = lazy(() => import('./pages/PatientDoctorPrescriptionsPage'));
const PatientMedicationsPage = lazy(() => import('./pages/PatientMedicationsPage'));
const PatientMedicationRemindersPage = lazy(() => import('./pages/PatientMedicationRemindersPage'));
const PatientVitalSignsPage = lazy(() => import('./pages/PatientVitalSignsPage'));
const PatientVisitsPage = lazy(() => import('./pages/PatientVisitsPage'));
const PatientAppointmentsPage = lazy(() => import('./pages/PatientAppointmentsPage'));
const PatientPrescriptionsPage = lazy(() => import('./pages/PatientPrescriptionsPage'));
const PatientPrescriptionDetailPage = lazy(() => import('./pages/PatientPrescriptionDetailPage'));
const PatientEmergencyContactsPage = lazy(() => import('./pages/PatientEmergencyContactsPage'));
const PatientFamilyMembersPage = lazy(() => import('./pages/PatientFamilyMembersPage'));
const PatientFamilyMemberDetailPage = lazy(() => import('./pages/PatientFamilyMemberDetailPage'));
const PatientMedicalHistoryPage = lazy(() => import('./pages/PatientMedicalHistoryPage'));
const PatientAccessRequestsPage = lazy(() => import('./pages/PatientAccessRequestsPage'));
const VerificationPending = lazy(() => import('./pages/VerificationPending'));
const HospitalDashboard = lazy(() => import('./pages/HospitalDashboard'));
const LaboratoryDashboard = lazy(() => import('./pages/LaboratoryDashboard'));
const SecretaryDashboard = lazy(() => import('./pages/SecretaryDashboard'));
const SecretaryAccessRequestsPage = lazy(() => import('./pages/SecretaryAccessRequestsPage'));
const SecretaryAppointmentsPage = lazy(() => import('./pages/SecretaryAppointmentsPage'));
const SecretaryPatientsPage = lazy(() => import('./pages/SecretaryPatientsPage'));
const SecretaryPatientDetailPage = lazy(() => import('./pages/SecretaryPatientDetailPage'));
const SecretaryAppointmentCreatePage = lazy(() => import('./pages/SecretaryAppointmentCreatePage'));
const SecretarySecretariesPage = lazy(() => import('./pages/SecretarySecretariesPage'));
const SecretarySecretaryDetailPage = lazy(() => import('./pages/SecretarySecretaryDetailPage'));

const isBlockedPendingUser = (
  user: ReturnType<typeof useAuth>['user']
) => !!user && ['doctor', 'pharmacy', 'hopital', 'laboratoire', 'secretaire'].includes(user.role) && user.verification_status !== 'approved';

const RoleRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Redirect to="/login" />;
  }
  if (isBlockedPendingUser(user)) {
    return <Redirect to="/verification" />;
  }
  return <Redirect to={`/${user.role}`} />;
};

const RequireRole: React.FC<{ role?: string; children: React.ReactElement }> = ({ role, children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  if (isBlockedPendingUser(user)) {
    return <Redirect to="/verification" />;
  }
  if (role && user.role !== role) {
    return <Redirect to={`/${user.role}`} />;
  }
  return children;
};

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  return children;
};

const RoutePreloader: React.FC = () => {
  useEffect(() => {
    const preload = () => {
      void Promise.allSettled([
        import('./pages/DoctorDashboard'),
        import('./pages/DoctorCreatePrescriptionPage'),
        import('./pages/DoctorPatientsPage'),
        import('./pages/DoctorPatientPrescriptionsPage'),
        import('./pages/DoctorVisitFormPage'),
        import('./pages/DoctorMyVisitsPage'),
        import('./pages/DoctorMyAppointmentsPage'),
        import('./pages/DoctorVisitDetailPage'),
        import('./pages/DoctorPrescriptionsPage'),
        import('./pages/DoctorPrescriptionDetailPage'),
        import('./pages/DoctorDoctorsDirectoryPage'),
        import('./pages/DoctorDoctorDetailPage'),
        import('./pages/DoctorLaboratoriesDirectoryPage'),
        import('./pages/DoctorHospitalsDirectoryPage'),
        import('./pages/DoctorLaboratoryDetailPage'),
        import('./pages/DoctorHospitalDetailPage'),
        import('./pages/DoctorPharmaciesDirectoryPage'),
        import('./pages/DoctorPharmacyDetailPage'),
        import('./pages/DoctorMedicalHistoryEntryPage'),
        import('./pages/DoctorSecretariesPage'),
        import('./pages/DoctorSecretaryDetailPage'),
        import('./pages/PharmacyDashboard'),
        import('./pages/PharmacyPosHomePage'),
        import('./pages/PatientPrescriptionsPage'),
        import('./pages/PharmacyPrescriptionsPage'),
        import('./pages/PharmacyDoctorsDirectoryPage'),
        import('./pages/PharmacyDoctorDetailPage'),
        import('./pages/PharmacyLaboratoriesDirectoryPage'),
        import('./pages/PharmacyHospitalsDirectoryPage'),
        import('./pages/PharmacyLaboratoryDetailPage'),
        import('./pages/PharmacyHospitalDetailPage'),
        import('./pages/PharmacyPharmaciesDirectoryPage'),
        import('./pages/PharmacyPharmacyDetailPage'),
        import('./pages/PatientDashboard'),
        import('./pages/PatientDoctorsPage'),
        import('./pages/PatientHospitalsPage'),
        import('./pages/PatientLaboratoriesPage'),
        import('./pages/PatientHospitalDetailPage'),
        import('./pages/PatientLaboratoryDetailPage'),
        import('./pages/PatientPharmaciesPage'),
        import('./pages/PatientPharmacyDetailPage'),
        import('./pages/PatientDoctorPrescriptionsPage'),
        import('./pages/PatientMedicationsPage'),
        import('./pages/PatientMedicationRemindersPage'),
        import('./pages/PatientVitalSignsPage'),
        import('./pages/PatientVisitsPage'),
        import('./pages/PatientAppointmentsPage'),
        import('./pages/PatientPrescriptionDetailPage'),
        import('./pages/PatientEmergencyContactsPage'),
        import('./pages/PatientFamilyMembersPage'),
        import('./pages/PatientFamilyMemberDetailPage'),
        import('./pages/PatientMedicalHistoryPage'),
        import('./pages/PatientAccessRequestsPage'),
        import('./pages/AdminDashboard'),
        import('./pages/AdminDoctorsPage'),
        import('./pages/AdminDoctorDetailPage'),
        import('./pages/AdminHospitalsPage'),
        import('./pages/AdminLaboratoriesPage'),
        import('./pages/AdminHospitalDetailPage'),
        import('./pages/AdminLaboratoryDetailPage'),
        import('./pages/AdminPharmaciesPage'),
        import('./pages/AdminPharmacyDetailPage'),
        import('./pages/AdminPatientsPage'),
        import('./pages/AdminPatientDetailPage'),
        import('./pages/AdminPasswordResetLogsPage'),
        import('./pages/AdminRoleAccountsPage'),
        import('./pages/HospitalDashboard'),
        import('./pages/LaboratoryDashboard'),
        import('./pages/SecretaryDashboard'),
        import('./pages/SecretaryAccessRequestsPage'),
        import('./pages/SecretaryAppointmentsPage'),
        import('./pages/SecretaryPatientsPage'),
        import('./pages/SecretaryPatientDetailPage'),
        import('./pages/SecretaryAppointmentCreatePage'),
        import('./pages/SecretarySecretariesPage'),
        import('./pages/SecretarySecretaryDetailPage'),
      ]);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(preload);
      return;
    }

    const timeout = globalThis.setTimeout(preload, 300);
    return () => globalThis.clearTimeout(timeout);
  }, []);

  return null;
};

const RuntimeRecovery: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const shouldReloadForChunkError = (message: string) => {
      const lower = message.toLowerCase();
      return (
        lower.includes('loading chunk') ||
        lower.includes('failed to fetch dynamically imported module') ||
        lower.includes('importing a module script failed') ||
        lower.includes('chunkloaderror')
      );
    };

    const tryRecover = (reason: string) => {
      const key = 'app-runtime-reloaded-once';
      if (window.sessionStorage.getItem(key) === '1') {
        return;
      }
      if (!navigator.onLine) {
        return;
      }
      window.sessionStorage.setItem(key, '1');
      // Keep a small trace for debugging when users report black-screen reloads.
      window.sessionStorage.setItem('app-runtime-reload-reason', reason);
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      if (message && shouldReloadForChunkError(message)) {
        tryRecover(message);
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message
            ? String(reason.message)
            : '';
      if (message && shouldReloadForChunkError(message)) {
        tryRecover(message);
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
};

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <RuntimeRecovery />
        <RoutePreloader />
        <Suspense
          fallback={(
            <IonPage>
              <IonContent
                style={{
                  '--background': '#ffffff',
                  background: '#ffffff',
                }}
              >
                <div
                  style={{
                    minHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IonSpinner name="crescent" />
                </div>
              </IonContent>
            </IonPage>
          )}
        >
          <IonRouterOutlet animated={false}>
            <Route exact path="/login">
              <Login />
            </Route>
          <Route exact path="/register">
            <Register />
          </Route>
          <Route exact path="/claim-account">
            <ClaimAccountPage />
          </Route>
          <Route exact path="/password-recovery">
            <PasswordRecoveryRequestPage />
          </Route>
          <Route exact path="/reset-password">
            <ResetPasswordPage />
          </Route>
          <Route exact path="/recovery-approval">
            <RecoveryApprovalPage />
          </Route>
          <Route exact path="/verification">
            <RequireAuth>
              <VerificationPending />
            </RequireAuth>
          </Route>
          <Route exact path="/doctor">
            <RequireRole role="doctor">
              <DoctorDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/create-prescription">
            <RequireRole role="doctor">
              <DoctorCreatePrescriptionPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/patients">
            <RequireRole role="doctor">
              <DoctorPatientsPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/patients/:patientName">
            <RequireRole role="doctor">
              <DoctorPatientPrescriptionsPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/visits/new">
            <RequireRole role="doctor">
              <DoctorVisitFormPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/visit-form/new">
            <RequireRole role="doctor">
              <DoctorVisitFormPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/mes-visites">
            <RequireRole role="doctor">
              <DoctorMyVisitsPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/mes-rendez-vous">
            <RequireRole role="doctor">
              <DoctorMyAppointmentsPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/visits/:visitId">
            <RequireRole role="doctor">
              <DoctorVisitDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/prescriptions">
            <RequireRole role="doctor">
              <DoctorPrescriptionsPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/prescriptions/:id">
            <RequireRole role="doctor">
              <DoctorPrescriptionDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/doctors">
            <RequireRole role="doctor">
              <DoctorDoctorsDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/doctors/:doctorId">
            <RequireRole role="doctor">
              <DoctorDoctorDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/secretaires">
            <RequireRole role="doctor">
              <DoctorSecretariesPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/secretaires/:secretaryId">
            <RequireRole role="doctor">
              <DoctorSecretaryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/pharmacies">
            <RequireRole role="doctor">
              <DoctorPharmaciesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/laboratoires">
            <RequireRole role="doctor">
              <DoctorLaboratoriesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/hopitaux">
            <RequireRole role="doctor">
              <DoctorHospitalsDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/pharmacies/:pharmacyId">
            <RequireRole role="doctor">
              <DoctorPharmacyDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/hopitaux/:facilityId">
            <RequireRole role="doctor">
              <DoctorHospitalDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/laboratoires/:facilityId">
            <RequireRole role="doctor">
              <DoctorLaboratoryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/medical-history/:id">
            <RequireRole role="doctor">
              <DoctorMedicalHistoryEntryPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy">
            <RequireRole role="pharmacy">
              <PharmacyDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/prescriptions">
            <RequireRole role="pharmacy">
              <PharmacyPrescriptionsPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/pos">
            <RequireRole role="pharmacy">
              <PharmacyPosHomePage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/doctors">
            <RequireRole role="pharmacy">
              <PharmacyDoctorsDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/doctors/:doctorId">
            <RequireRole role="pharmacy">
              <PharmacyDoctorDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/pharmacies">
            <RequireRole role="pharmacy">
              <PharmacyPharmaciesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/laboratoires">
            <RequireRole role="pharmacy">
              <PharmacyLaboratoriesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/hopitaux">
            <RequireRole role="pharmacy">
              <PharmacyHospitalsDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/pharmacies/:pharmacyId">
            <RequireRole role="pharmacy">
              <PharmacyPharmacyDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/hopitaux/:facilityId">
            <RequireRole role="pharmacy">
              <PharmacyHospitalDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/pharmacy/laboratoires/:facilityId">
            <RequireRole role="pharmacy">
              <PharmacyLaboratoryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin">
            <RequireRole role="admin">
              <AdminDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/admin/doctors">
            <RequireRole role="admin">
              <AdminDoctorsPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/doctors/:doctorId">
            <RequireRole role="admin">
              <AdminDoctorDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/pharmacies">
            <RequireRole role="admin">
              <AdminPharmaciesPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/hopitaux">
            <RequireRole role="admin">
              <AdminHospitalsPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/laboratoires">
            <RequireRole role="admin">
              <AdminLaboratoriesPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/hopitaux/:hospitalId">
            <RequireRole role="admin">
              <AdminHospitalDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/laboratoires/:laboratoryId">
            <RequireRole role="admin">
              <AdminLaboratoryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/pharmacies/:pharmacyId">
            <RequireRole role="admin">
              <AdminPharmacyDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/patients">
            <RequireRole role="admin">
              <AdminPatientsPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/patients/:patientId">
            <RequireRole role="admin">
              <AdminPatientDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/password-reset-logs">
            <RequireRole role="admin">
              <AdminPasswordResetLogsPage />
            </RequireRole>
          </Route>
          <Route exact path="/admin/comptes-hopitaux">
            <RequireRole role="admin">
              <AdminRoleAccountsPage role="hopital" title="Comptes hopitaux" icon={businessOutline} />
            </RequireRole>
          </Route>
          <Route exact path="/admin/comptes-laboratoires">
            <RequireRole role="admin">
              <AdminRoleAccountsPage role="laboratoire" title="Comptes laboratoires" icon={beaker} />
            </RequireRole>
          </Route>
          <Route exact path="/admin/comptes-secretaires">
            <RequireRole role="admin">
              <AdminRoleAccountsPage role="secretaire" title="Comptes secretaires" icon={personCircleOutline} />
            </RequireRole>
          </Route>
          <Route exact path="/patient">
            <RequireRole role="patient">
              <PatientDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/patient/doctors">
            <RequireRole role="patient">
              <PatientDoctorsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/pharmacies">
            <RequireRole role="patient">
              <PatientPharmaciesPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/laboratoires">
            <RequireRole role="patient">
              <PatientLaboratoriesPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/laboratories">
            <RequireRole role="patient">
              <PatientLaboratoriesPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/hopitaux">
            <RequireRole role="patient">
              <PatientHospitalsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/hospitals">
            <RequireRole role="patient">
              <PatientHospitalsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/pharmacies/:pharmacyId">
            <RequireRole role="patient">
              <PatientPharmacyDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/hopitaux/:facilityId">
            <RequireRole role="patient">
              <PatientHospitalDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/hospitals/:facilityId">
            <RequireRole role="patient">
              <PatientHospitalDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/laboratoires/:facilityId">
            <RequireRole role="patient">
              <PatientLaboratoryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/laboratories/:facilityId">
            <RequireRole role="patient">
              <PatientLaboratoryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/doctors/:doctorId">
            <RequireRole role="patient">
              <PatientDoctorPrescriptionsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/prescriptions">
            <RequireRole role="patient">
              <PatientPrescriptionsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/medicaments">
            <RequireRole role="patient">
              <PatientMedicationsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/medication-reminders">
            <RequireRole role="patient">
              <PatientMedicationRemindersPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/signes-vitaux">
            <RequireRole role="patient">
              <PatientVitalSignsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/visites">
            <RequireRole role="patient">
              <PatientVisitsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/rendez-vous">
            <RequireRole role="patient">
              <PatientAppointmentsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/prescriptions/:id">
            <RequireRole role="patient">
              <PatientPrescriptionDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/emergency-contacts">
            <RequireRole role="patient">
              <PatientEmergencyContactsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/family-members">
            <RequireRole role="patient">
              <PatientFamilyMembersPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/family-members/:memberId">
            <RequireRole role="patient">
              <PatientFamilyMemberDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/medical-history">
            <RequireRole role="patient">
              <PatientMedicalHistoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/access-requests">
            <RequireRole role="patient">
              <PatientAccessRequestsPage />
            </RequireRole>
          </Route>
          <Route exact path="/hopital">
            <RequireRole role="hopital">
              <HospitalDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/laboratoire">
            <RequireRole role="laboratoire">
              <LaboratoryDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire">
            <RequireRole role="secretaire">
              <SecretaryDashboard />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/access-requests">
            <RequireRole role="secretaire">
              <SecretaryAccessRequestsPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/rendez-vous">
            <RequireRole role="secretaire">
              <SecretaryAppointmentsPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/patients">
            <RequireRole role="secretaire">
              <SecretaryPatientsPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/patients/:patientId">
            <RequireRole role="secretaire">
              <SecretaryPatientDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/patients/:patientId/rendez-vous/new">
            <RequireRole role="secretaire">
              <SecretaryAppointmentsPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/patients/:patientId/rendez-vous/:appointmentId/edit">
            <RequireRole role="secretaire">
              <SecretaryAppointmentCreatePage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/doctors">
            <RequireRole role="secretaire">
              <DoctorDoctorsDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/doctors/:doctorId">
            <RequireRole role="secretaire">
              <DoctorDoctorDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/pharmacies">
            <RequireRole role="secretaire">
              <DoctorPharmaciesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/pharmacies/:pharmacyId">
            <RequireRole role="secretaire">
              <DoctorPharmacyDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/hopitaux">
            <RequireRole role="secretaire">
              <DoctorHospitalsDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/hopitaux/:facilityId">
            <RequireRole role="secretaire">
              <DoctorHospitalDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/laboratoires">
            <RequireRole role="secretaire">
              <DoctorLaboratoriesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/laboratoires/:facilityId">
            <RequireRole role="secretaire">
              <DoctorLaboratoryDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/secretaires">
            <RequireRole role="secretaire">
              <SecretarySecretariesPage />
            </RequireRole>
          </Route>
          <Route exact path="/secretaire/secretaires/:secretaryId">
            <RequireRole role="secretaire">
              <SecretarySecretaryDetailPage />
            </RequireRole>
          </Route>
            <Route exact path="/">
              <RoleRedirect />
            </Route>
          </IonRouterOutlet>
        </Suspense>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
