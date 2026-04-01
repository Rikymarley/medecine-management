import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { callOutline, chevronDownOutline, chevronForwardOutline, locateOutline, logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';

const toNumber = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PatientPharmaciesPage: React.FC = () => {
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [expandedHours, setExpandedHours] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.getPharmacies().then(setPharmacies).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalisation non disponible.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationError(null);
      },
      () => setLocationError('Position non disponible. Affichage alphabetique.')
    );
  }, []);

  const sorted = useMemo(() => {
    const rows = pharmacies.map((pharmacy) => {
      if (!location) {
        return { pharmacy, distanceKm: null as number | null };
      }
      const lat = toNumber(pharmacy.latitude);
      const lon = toNumber(pharmacy.longitude);
      if (lat === null || lon === null) {
        return { pharmacy, distanceKm: null as number | null };
      }
      return {
        pharmacy,
        distanceKm: toKm(location.lat, location.lon, lat, lon)
      };
    });

    return rows.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return a.pharmacy.name.localeCompare(b.pharmacy.name, 'fr', { sensitivity: 'base' });
      }
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return a.pharmacy.name.localeCompare(b.pharmacy.name, 'fr', { sensitivity: 'base' });
    });
  }, [location, pharmacies]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Pharmacies proches</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Pharmacies (plus proches d'abord)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {locationError ? (
              <IonText color="warning">
                <p>{locationError}</p>
              </IonText>
            ) : null}
            {sorted.length === 0 ? (
              <IonText color="medium">
                <p>Aucune pharmacie disponible.</p>
              </IonText>
            ) : (
              <IonList>
                {sorted.map(({ pharmacy, distanceKm }) => (
                  <IonItem key={pharmacy.id} lines="full">
                    <IonLabel>
                      <div
                        style={{
                          padding: '8px 0',
                          display: 'grid',
                          gridTemplateColumns: '36px 1fr',
                          gap: '10px',
                          alignItems: 'start'
                        }}
                      >
                        <IonIcon icon={storefrontOutline} color="primary" style={{ fontSize: '30px', marginTop: '2px' }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                            <h2 style={{ fontWeight: 800, margin: 0 }}>{pharmacy.name}</h2>
                            <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                              {pharmacy.temporary_closed ? 'Temp. fermee' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                            </IonBadge>
                          </div>
                          <div style={{ marginTop: '4px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1rem' }}>
                            <span>{pharmacy.address || 'Adresse non renseignee'}</span>
                            <IonButton
                              fill="clear"
                              size="small"
                              href={
                                toNumber(pharmacy.latitude) !== null && toNumber(pharmacy.longitude) !== null
                                  ? `https://maps.google.com/?q=${toNumber(pharmacy.latitude)},${toNumber(pharmacy.longitude)}`
                                  : `https://maps.google.com/?q=${encodeURIComponent(
                                      pharmacy.address || pharmacy.name
                                    )}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IonIcon icon={locateOutline} />
                            </IonButton>
                          </div>
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1rem' }}>
                            <span>{pharmacy.phone || 'Telephone non renseigne'}</span>
                            <IonButton
                              fill="clear"
                              size="small"
                              disabled={!pharmacy.phone}
                              href={pharmacy.phone ? `tel:${pharmacy.phone}` : undefined}
                            >
                              <IonIcon icon={callOutline} />
                            </IonButton>
                            <IonButton
                              fill="clear"
                              size="small"
                              disabled={!pharmacy.phone}
                              href={
                                pharmacy.phone
                                  ? `https://wa.me/${pharmacy.phone.replace(/\D/g, '')}`
                                  : undefined
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IonIcon icon={logoWhatsapp} />
                            </IonButton>
                          </div>
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            {distanceKm === null ? 'Distance : inconnue' : `Distance : ${distanceKm.toFixed(2)} km`}
                          </p>
                        </div>
                      </div>
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', cursor: 'pointer' }}
                        onClick={() =>
                          setExpandedHours((prev) => ({ ...prev, [pharmacy.id]: !(prev[pharmacy.id] ?? false) }))
                        }
                      >
                        <strong style={{ fontSize: '0.85rem' }}>Horaires :</strong>
                        <IonButton
                          size="small"
                          fill="clear"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedHours((prev) => ({ ...prev, [pharmacy.id]: !(prev[pharmacy.id] ?? false) }));
                          }}
                        >
                          <IonIcon icon={(expandedHours[pharmacy.id] ?? false) ? chevronDownOutline : chevronForwardOutline} />
                        </IonButton>
                      </div>
                      {(expandedHours[pharmacy.id] ?? false) ? (
                        <div>
                          <div
                            style={{
                              borderTop: '1px solid #dbe7ef',
                              borderBottom: '1px solid #dbe7ef',
                              padding: '8px 0',
                              marginTop: '4px',
                              marginBottom: '6px'
                            }}
                          >
                          {pharmacy.opening_hours ? (
                            <div>
                              {pharmacy.opening_hours
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean)
                                .map((line, idx) => (
                                  <div key={`${pharmacy.id}-h-${idx}`} style={{ fontSize: '0.85rem', lineHeight: 1.35 }}>
                                    {line}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem' }}>Non renseignes</div>
                          )}
                          </div>
                        </div>
                      ) : null}
                    </IonLabel>
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

export default PatientPharmaciesPage;
