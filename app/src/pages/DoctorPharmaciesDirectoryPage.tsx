import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';

const DoctorPharmaciesDirectoryPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [canVerify, setCanVerify] = useState(false);
  const [updatingPharmacyId, setUpdatingPharmacyId] = useState<number | null>(null);
  const [updatingAccountPharmacyId, setUpdatingAccountPharmacyId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      setCanVerify(!!user?.can_verify_accounts);
      setToken(localStorage.getItem('token'));
    } catch {
      setCanVerify(false);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      api.getPharmacies().then(setPharmacies).catch(() => undefined);
      return;
    }
    api.getPharmaciesForDoctor(token).then(setPharmacies).catch(() => undefined);
  }, [token]);

  const verifyPharmacy = async (pharmacyId: number) => {
    if (!token) {
      return;
    }

    try {
      setUpdatingPharmacyId(pharmacyId);
      const updated = await api.verifyPharmacyLicense(token, pharmacyId, { verified: true });
      setPharmacies((prev) => prev.map((pharmacy) => (pharmacy.id === pharmacyId ? { ...pharmacy, ...updated } : pharmacy)));
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingPharmacyId(null);
    }
  };

  const unverifyPharmacy = async (pharmacyId: number) => {
    if (!token) {
      return;
    }

    try {
      setUpdatingPharmacyId(pharmacyId);
      const updated = await api.verifyPharmacyLicense(token, pharmacyId, { verified: false });
      setPharmacies((prev) => prev.map((pharmacy) => (pharmacy.id === pharmacyId ? { ...pharmacy, ...updated } : pharmacy)));
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingPharmacyId(null);
    }
  };

  const approvePharmacyAccount = async (pharmacy: ApiPharmacy) => {
    if (!token || !pharmacy.pharmacy_user_id) {
      return;
    }

    try {
      setUpdatingAccountPharmacyId(pharmacy.id);
      await api.approvePharmacyAccount(token, pharmacy.pharmacy_user_id);
      const refreshed = await api.getPharmaciesForDoctor(token);
      setPharmacies(refreshed);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingAccountPharmacyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? pharmacies.filter((pharmacy) =>
          `${pharmacy.name} ${pharmacy.address ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : pharmacies;

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [pharmacies, query]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Annuaire pharmacies</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, adresse..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucune pharmacie trouvee.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((pharmacy) => (
                  <IonItem key={pharmacy.id} lines="full">
                    <IonIcon icon={storefrontOutline} slot="start" color="primary" />
                    <IonLabel>
                      <h3>{pharmacy.name}</h3>
                      <p>{pharmacy.address || 'Adresse non renseignee'}</p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                          {pharmacy.temporary_closed ? 'Fermeture temporaire' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                        </IonBadge>
                        {pharmacy.account_verification_status !== 'approved' ? (
                          <IonBadge color="warning">Compte en attente</IonBadge>
                        ) : null}
                        {!pharmacy.license_verified ? (
                          <IonBadge color="warning">Licence non verifiee</IonBadge>
                        ) : null}
                        {pharmacy.license_verified && pharmacy.license_verified_by_doctor_name ? (
                          <IonBadge color="light">Verifiee par {pharmacy.license_verified_by_doctor_name}</IonBadge>
                        ) : null}
                        {pharmacy.emergency_available ? <IonBadge color="warning">Urgence</IonBadge> : null}
                      </div>
                      {pharmacy.account_verification_status !== 'approved' && pharmacy.account_verified_by_name ? (
                        <p>En attente (dernier traitement: {pharmacy.account_verified_by_name})</p>
                      ) : null}
                      {!pharmacy.license_verified && canVerify ? (
                        <div style={{ marginTop: '8px' }}>
                          <IonButton
                            size="small"
                            color="success"
                            fill="outline"
                            disabled={updatingPharmacyId === pharmacy.id}
                            onClick={() => verifyPharmacy(pharmacy.id)}
                          >
                            Verifier la licence
                          </IonButton>
                        </div>
                      ) : null}
                      {pharmacy.license_verified && canVerify ? (
                        <div style={{ marginTop: '8px' }}>
                          <IonButton
                            size="small"
                            color="warning"
                            fill="outline"
                            disabled={updatingPharmacyId === pharmacy.id}
                            onClick={() => unverifyPharmacy(pharmacy.id)}
                          >
                            Retirer verification licence
                          </IonButton>
                        </div>
                      ) : null}
                      {pharmacy.account_verification_status !== 'approved' && canVerify && pharmacy.pharmacy_user_id ? (
                        <div style={{ marginTop: '8px' }}>
                          <IonButton
                            size="small"
                            color="tertiary"
                            fill="outline"
                            disabled={updatingAccountPharmacyId === pharmacy.id}
                            onClick={() => approvePharmacyAccount(pharmacy)}
                          >
                            Approuver le compte
                          </IonButton>
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <a href={pharmacy.phone ? `tel:${pharmacy.phone}` : '#'} style={{ pointerEvents: pharmacy.phone ? 'auto' : 'none', opacity: pharmacy.phone ? 1 : 0.4 }}>
                          <IonIcon icon={callOutline} />
                        </a>
                        <a
                          href={pharmacy.phone ? `https://wa.me/${pharmacy.phone.replace(/\D/g, '')}` : '#'}
                          style={{ pointerEvents: pharmacy.phone ? 'auto' : 'none', opacity: pharmacy.phone ? 1 : 0.4 }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IonIcon icon={logoWhatsapp} />
                        </a>
                        <a
                          href={
                            pharmacy.latitude && pharmacy.longitude
                              ? `https://www.google.com/maps/search/?api=1&query=${pharmacy.latitude},${pharmacy.longitude}`
                              : '#'
                          }
                          style={{
                            pointerEvents: pharmacy.latitude && pharmacy.longitude ? 'auto' : 'none',
                            opacity: pharmacy.latitude && pharmacy.longitude ? 1 : 0.4
                          }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IonIcon icon={locateOutline} />
                        </a>
                      </div>
                    </IonLabel>
                    <IonButton
                      slot="end"
                      fill="clear"
                      onClick={() => ionRouter.push(`/doctor/pharmacies/${pharmacy.id}`, 'forward', 'push')}
                    >
                      Voir
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default DoctorPharmaciesDirectoryPage;
