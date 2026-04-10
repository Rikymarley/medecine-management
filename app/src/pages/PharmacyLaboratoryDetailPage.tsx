import { beaker } from 'ionicons/icons';
import FacilityDetailView from '../components/FacilityDetailView';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';

const PharmacyLaboratoryDetailPage: React.FC = () => {
  const { token } = useAuth();
  return (
    <FacilityDetailView
      title="Detail laboratoire"
      emptyMessage="Laboratoire introuvable."
      backHref="/pharmacy/laboratoires"
      icon={beaker}
      loadPublic={api.getLaboratories}
      loadPrivate={api.getLaboratoriesForPharmacy}
      token={token}
    />
  );
};

export default PharmacyLaboratoryDetailPage;

