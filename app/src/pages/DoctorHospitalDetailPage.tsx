import { businessOutline } from 'ionicons/icons';
import FacilityDetailView from '../components/FacilityDetailView';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';

const DoctorHospitalDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  const isDoctorContext = user?.role === 'doctor';
  return (
    <FacilityDetailView
      title="Detail hopital"
      emptyMessage="Hopital introuvable."
      backHref={isDoctorContext ? '/doctor/hopitaux' : '/secretaire/hopitaux'}
      icon={businessOutline}
      loadPublic={api.getHospitals}
      loadPrivate={api.getHospitalsForDoctor}
      token={isDoctorContext ? token : null}
      showVerificationBadges={isDoctorContext && !!user?.can_verify_accounts}
    />
  );
};

export default DoctorHospitalDetailPage;
