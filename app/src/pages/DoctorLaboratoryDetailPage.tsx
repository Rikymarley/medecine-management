import { beaker } from 'ionicons/icons';
import FacilityDetailView from '../components/FacilityDetailView';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';

const DoctorLaboratoryDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  const isDoctorContext = user?.role === 'doctor';
  return (
    <FacilityDetailView
      title="Detail laboratoire"
      emptyMessage="Laboratoire introuvable."
      backHref={isDoctorContext ? '/doctor/laboratoires' : '/secretaire/laboratoires'}
      icon={beaker}
      loadPublic={api.getLaboratories}
      loadPrivate={api.getLaboratoriesForDoctor}
      token={isDoctorContext ? token : null}
      showVerificationBadges={isDoctorContext && !!user?.can_verify_accounts}
    />
  );
};

export default DoctorLaboratoryDetailPage;
