import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Login from './pages/Login';
import Register from './pages/Register';
import ClaimAccountPage from './pages/ClaimAccountPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RecoveryApprovalPage from './pages/RecoveryApprovalPage';
import PasswordRecoveryRequestPage from './pages/PasswordRecoveryRequestPage';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorCreatePrescriptionPage from './pages/DoctorCreatePrescriptionPage';
import DoctorPrescriptionDetailPage from './pages/DoctorPrescriptionDetailPage';
import DoctorPatientPrescriptionsPage from './pages/DoctorPatientPrescriptionsPage';
import DoctorVisitFormPage from './pages/DoctorVisitFormPage';
import PharmacyDashboard from './pages/PharmacyDashboard';
import PharmacyPrescriptionsPage from './pages/PharmacyPrescriptionsPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorPatientsPage from './pages/DoctorPatientsPage';
import DoctorPrescriptionsPage from './pages/DoctorPrescriptionsPage';
import DoctorDoctorsDirectoryPage from './pages/DoctorDoctorsDirectoryPage';
import DoctorDoctorDetailPage from './pages/DoctorDoctorDetailPage';
import DoctorPharmaciesDirectoryPage from './pages/DoctorPharmaciesDirectoryPage';
import DoctorPharmacyDetailPage from './pages/DoctorPharmacyDetailPage';
import DoctorMedicalHistoryEntryPage from './pages/DoctorMedicalHistoryEntryPage';
import DoctorVisitDetailPage from './pages/DoctorVisitDetailPage';
import PharmacyDoctorsDirectoryPage from './pages/PharmacyDoctorsDirectoryPage';
import PharmacyDoctorDetailPage from './pages/PharmacyDoctorDetailPage';
import PharmacyPharmaciesDirectoryPage from './pages/PharmacyPharmaciesDirectoryPage';
import PharmacyPharmacyDetailPage from './pages/PharmacyPharmacyDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminDoctorsPage from './pages/AdminDoctorsPage';
import AdminDoctorDetailPage from './pages/AdminDoctorDetailPage';
import AdminPharmaciesPage from './pages/AdminPharmaciesPage';
import AdminPharmacyDetailPage from './pages/AdminPharmacyDetailPage';
import AdminPatientsPage from './pages/AdminPatientsPage';
import AdminPatientDetailPage from './pages/AdminPatientDetailPage';
import AdminPasswordResetLogsPage from './pages/AdminPasswordResetLogsPage';
import PatientDoctorsPage from './pages/PatientDoctorsPage';
import PatientPharmaciesPage from './pages/PatientPharmaciesPage';
import PatientPharmacyDetailPage from './pages/PatientPharmacyDetailPage';
import PatientDoctorPrescriptionsPage from './pages/PatientDoctorPrescriptionsPage';
import PatientPrescriptionsPage from './pages/PatientPrescriptionsPage';
import PatientPrescriptionDetailPage from './pages/PatientPrescriptionDetailPage';
import PatientEmergencyContactsPage from './pages/PatientEmergencyContactsPage';
import PatientFamilyMembersPage from './pages/PatientFamilyMembersPage';
import PatientFamilyMemberDetailPage from './pages/PatientFamilyMemberDetailPage';
import PatientMedicalHistoryPage from './pages/PatientMedicalHistoryPage';
import VerificationPending from './pages/VerificationPending';
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

const isBlockedPendingUser = (
  user: ReturnType<typeof useAuth>['user']
) => !!user && ['doctor', 'pharmacy'].includes(user.role) && user.verification_status !== 'approved';

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

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
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
          <Route exact path="/doctor/pharmacies">
            <RequireRole role="doctor">
              <DoctorPharmaciesDirectoryPage />
            </RequireRole>
          </Route>
          <Route exact path="/doctor/pharmacies/:pharmacyId">
            <RequireRole role="doctor">
              <DoctorPharmacyDetailPage />
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
          <Route exact path="/pharmacy/pharmacies/:pharmacyId">
            <RequireRole role="pharmacy">
              <PharmacyPharmacyDetailPage />
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
          <Route exact path="/patient/pharmacies/:pharmacyId">
            <RequireRole role="patient">
              <PatientPharmacyDetailPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/doctors/:doctorName">
            <RequireRole role="patient">
              <PatientDoctorPrescriptionsPage />
            </RequireRole>
          </Route>
          <Route exact path="/patient/prescriptions">
            <RequireRole role="patient">
              <PatientPrescriptionsPage />
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
          <Route exact path="/">
            <RoleRedirect />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
