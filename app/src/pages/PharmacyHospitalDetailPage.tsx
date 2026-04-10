import { businessOutline } from 'ionicons/icons';
import FacilityDetailView from '../components/FacilityDetailView';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';

const PharmacyHospitalDetailPage: React.FC = () => {
  const { token } = useAuth();
  return (
    <FacilityDetailView
      title="Detail hopital"
      emptyMessage="Hopital introuvable."
      backHref="/pharmacy/hopitaux"
      icon={businessOutline}
      loadPublic={api.getHospitals}
      loadPrivate={api.getHospitalsForPharmacy}
      token={token}
    />
  );
};

export default PharmacyHospitalDetailPage;

