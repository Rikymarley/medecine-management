import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
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
  IonSelect,
  IonSelectOption,
  IonText,
  IonToggle,
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
const DEFAULT_PAYMENT_METHODS = ['Cash', 'MonCash', 'NatCash', 'Carte', 'Virement'];

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
  const [query, setQuery] = useState('');
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [nightOnly, setNightOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<'' | 'low' | 'medium' | 'high'>('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

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
    const normalizedServiceFilter = serviceFilter.trim().toLowerCase();
    const normalizedPaymentFilter = paymentMethodFilter.trim().toLowerCase();
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? pharmacies.filter((pharmacy) => {
          const haystack = `${pharmacy.name} ${pharmacy.address ?? ''} ${pharmacy.services ?? ''} ${pharmacy.payment_methods ?? ''} ${pharmacy.notes_for_patients ?? ''}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : [...pharmacies];

    const filteredByAttributes = filtered.filter((pharmacy) => {
      if (onlyOpenNow && (pharmacy.temporary_closed || !pharmacy.open_now)) {
        return false;
      }
      if (deliveryOnly && !pharmacy.delivery_available) {
        return false;
      }
      if (nightOnly && !pharmacy.night_service) {
        return false;
      }
      if (priceRange && pharmacy.price_range !== priceRange) {
        return false;
      }
      if (normalizedServiceFilter) {
        const services = (pharmacy.services ?? '').toLowerCase();
        if (!services.includes(normalizedServiceFilter)) {
          return false;
        }
      }
      if (normalizedPaymentFilter) {
        const payments = (pharmacy.payment_methods ?? '').toLowerCase();
        if (!payments.includes(normalizedPaymentFilter)) {
          return false;
        }
      }
      return true;
    });

    const rows = filteredByAttributes.map((pharmacy) => {
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
  }, [deliveryOnly, location, nightOnly, onlyOpenNow, paymentMethodFilter, pharmacies, priceRange, query, serviceFilter]);

  const availableServices = useMemo(() => {
    const set = new Set<string>();
    pharmacies.forEach((pharmacy) => {
      (pharmacy.services ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => set.add(value));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [pharmacies]);

  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_PAYMENT_METHODS.forEach((value) => set.add(value));
    pharmacies.forEach((pharmacy) => {
      (pharmacy.payment_methods ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => set.add(value));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [pharmacies]);

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
          <IonCardContent>
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 170px)' }}>
              <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--app-surface)' }}>
                <IonSearchbar
                  value={query}
                  placeholder="Rechercher une pharmacie ou une adresse"
                  onIonInput={(event) => setQuery(event.detail.value ?? '')}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <IonItem lines="none">
                    <IonLabel>Ouverte</IonLabel>
                    <IonToggle checked={onlyOpenNow} onIonChange={(e) => setOnlyOpenNow(e.detail.checked)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>Livraison</IonLabel>
                    <IonToggle checked={deliveryOnly} onIonChange={(e) => setDeliveryOnly(e.detail.checked)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>Nuit</IonLabel>
                    <IonToggle checked={nightOnly} onIonChange={(e) => setNightOnly(e.detail.checked)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Prix</IonLabel>
                    <IonSelect
                      value={priceRange}
                      placeholder="Tous"
                      onIonChange={(e) => setPriceRange((e.detail.value as '' | 'low' | 'medium' | 'high') ?? '')}
                    >
                      <IonSelectOption value="">Tous</IonSelectOption>
                      <IonSelectOption value="low">Bas</IonSelectOption>
                      <IonSelectOption value="medium">Moyen</IonSelectOption>
                      <IonSelectOption value="high">Eleve</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                </div>
                <IonItem lines="none">
                  <IonLabel position="stacked">Service</IonLabel>
                  <IonSelect
                    value={serviceFilter}
                    placeholder="Tous les services"
                    onIonChange={(e) => setServiceFilter((e.detail.value as string) ?? '')}
                  >
                    <IonSelectOption value="">Tous les services</IonSelectOption>
                    {availableServices.map((service) => (
                      <IonSelectOption key={service} value={service}>
                        {service}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Paiement</IonLabel>
                  <IonSelect
                    value={paymentMethodFilter}
                    placeholder="Tous les paiements"
                    onIonChange={(e) => setPaymentMethodFilter((e.detail.value as string) ?? '')}
                  >
                    <IonSelectOption value="">Tous les paiements</IonSelectOption>
                    {availablePaymentMethods.map((method) => (
                      <IonSelectOption key={method} value={method}>
                        {method}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                {locationError ? (
                  <IonText color="warning">
                    <p>{locationError}</p>
                  </IonText>
                ) : null}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
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
                        {pharmacy.logo_url ? (
                          <img
                            src={pharmacy.logo_url}
                            alt={`Logo ${pharmacy.name}`}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', marginTop: '2px' }}
                          />
                        ) : (
                          <IonIcon icon={storefrontOutline} color="primary" style={{ fontSize: '30px', marginTop: '2px' }} />
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                            <h2 style={{ fontWeight: 800, margin: 0 }}>{pharmacy.name}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                                {pharmacy.temporary_closed ? 'Temp. fermee' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                              </IonBadge>
                              <IonBadge color={pharmacy.pharmacy_mode === 'pos_integrated' ? 'tertiary' : 'medium'}>
                                {pharmacy.pharmacy_mode === 'pos_integrated' ? 'POS' : 'Rapide'}
                              </IonBadge>
                            </div>
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
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            Services: {pharmacy.services || 'Non renseignes'}
                          </p>
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            Paiement: {pharmacy.payment_methods || 'Non renseignes'}
                          </p>
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            Prix: {pharmacy.price_range === 'low' ? 'Bas' : pharmacy.price_range === 'medium' ? 'Moyen' : pharmacy.price_range === 'high' ? 'Eleve' : 'Non renseigne'}
                            {' · '}
                            Attente: {pharmacy.average_wait_time ? `${pharmacy.average_wait_time} min` : 'Non renseignee'}
                          </p>
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            Livraison: {pharmacy.delivery_available ? `Oui${pharmacy.delivery_radius_km ? ` (${pharmacy.delivery_radius_km} km)` : ''}` : 'Non'}
                            {' · '}
                            Nuit: {pharmacy.night_service ? 'Oui' : 'Non'}
                          </p>
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            Licence: {pharmacy.license_number || 'Non renseignee'} {pharmacy.license_verified ? '(Verifiee)' : ''}
                          </p>
                          <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                            Stock confirme: {pharmacy.last_confirmed_stock_time ? `il y a ${Math.max(0, Math.round((Date.now() - new Date(pharmacy.last_confirmed_stock_time).getTime()) / 60000))} min` : 'Jamais'}
                          </p>
                          {pharmacy.notes_for_patients ? (
                            <p style={{ marginTop: '4px', fontSize: '1rem' }}>
                              Note: {pharmacy.notes_for_patients}
                            </p>
                          ) : null}
                          {pharmacy.storefront_image_url ? (
                            <img
                              src={pharmacy.storefront_image_url}
                              alt={`Vitrine ${pharmacy.name}`}
                              style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '10px', marginTop: '6px' }}
                            />
                          ) : null}
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
                            <div style={{ border: '1px solid #dbe7ef', borderRadius: '8px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  background: '#f8fafc',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  padding: '6px 8px'
                                }}
                              >
                                <span>Jour</span>
                                <span>Horaire</span>
                              </div>
                              {pharmacy.opening_hours
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean)
                                .map((line, idx) => {
                                  const [day, ...rest] = line.split(':');
                                  const hours = rest.join(':').trim() || '-';
                                  return (
                                    <div
                                      key={`${pharmacy.id}-h-${idx}`}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.35,
                                        padding: '6px 8px',
                                        borderTop: idx === 0 ? 'none' : '1px solid #eef2f7'
                                      }}
                                    >
                                      <span>{day?.trim() || '-'}</span>
                                      <span>{hours}</span>
                                    </div>
                                  );
                                })}
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
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PatientPharmaciesPage;
