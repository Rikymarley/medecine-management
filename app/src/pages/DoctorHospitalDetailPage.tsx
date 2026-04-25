import { businessOutline } from 'ionicons/icons';
import FacilityDetailView from '../components/FacilityDetailView';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';

const DoctorHospitalDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  return (
    <FacilityDetailView
      title="Detail hopital"
      emptyMessage="Hopital introuvable."
      backHref="/doctor/hopitaux"
      icon={businessOutline}
      loadPublic={api.getHospitals}
      loadPrivate={api.getHospitalsForDoctor}
      token={token}
      showVerificationBadges={!!user?.can_verify_accounts}
    />
  );
};

export default DoctorHospitalDetailPage;
