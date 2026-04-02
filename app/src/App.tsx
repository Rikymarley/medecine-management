import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorCreatePrescriptionPage from './pages/DoctorCreatePrescriptionPage';
import DoctorPrescriptionDetailPage from './pages/DoctorPrescriptionDetailPage';
import DoctorPatientPrescriptionsPage from './pages/DoctorPatientPrescriptionsPage';
import PharmacyDashboard from './pages/PharmacyDashboard';
import PatientDashboard from './pages/PatientDashboard';
import DoctorPatientsPage from './pages/DoctorPatientsPage';
import DoctorPrescriptionsPage from './pages/DoctorPrescriptionsPage';
import PatientDoctorsPage from './pages/PatientDoctorsPage';
import PatientPharmaciesPage from './pages/PatientPharmaciesPage';
import PatientDoctorPrescriptionsPage from './pages/PatientDoctorPrescriptionsPage';
import PatientPrescriptionsPage from './pages/PatientPrescriptionsPage';
import PatientPrescriptionDetailPage from './pages/PatientPrescriptionDetailPage';
import PatientEmergencyContactsPage from './pages/PatientEmergencyContactsPage';
import PatientFamilyMembersPage from './pages/PatientFamilyMembersPage';
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
import '@ionic/react/css/palettes/dark.system.css';

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
          <Route exact path="/pharmacy">
            <RequireRole role="pharmacy">
              <PharmacyDashboard />
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
