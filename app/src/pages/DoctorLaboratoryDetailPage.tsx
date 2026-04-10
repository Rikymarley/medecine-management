import { beaker } from 'ionicons/icons';
import FacilityDetailView from '../components/FacilityDetailView';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';

const DoctorLaboratoryDetailPage: React.FC = () => {
  const { token } = useAuth();
  return (
    <FacilityDetailView
      title="Detail laboratoire"
      emptyMessage="Laboratoire introuvable."
      backHref="/doctor/laboratoires"
      icon={beaker}
      loadPublic={api.getLaboratories}
      loadPrivate={api.getLaboratoriesForDoctor}
      token={token}
    />
  );
};

export default DoctorLaboratoryDetailPage;

