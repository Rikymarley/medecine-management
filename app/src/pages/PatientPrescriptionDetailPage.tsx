import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { callOutline, logoWhatsapp, medkitOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiFamilyMember, ApiPatientMedicinePurchase, ApiPharmacy, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime, minutesAgo, minutesUntil } from '../utils/time';

const availabilityLabel: Record<string, string> = {
  out_of_stock: '❌ Rupture',
  not_available: '❌ Rupture',
  very_low: '🔴 Tres bas (1-10)',
  low: '🟠 Bas (11-30)',
  available: '🟡 Disponible (31-100)',
  high: '🟢 Eleve (100+)',
  equivalent: '🔄 Equivalent'
};

const PatientPrescriptionDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [prescription, setPrescription] = useState<ApiPrescription | null>(null);
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [familyMembers, setFamilyMembers] = useState<ApiFamilyMember[]>([]);
  const [expandedPharmacies, setExpandedPharmacies] = useState<Record<number, boolean>>({});
  const [purchases, setPurchases] = useState<ApiPatientMedicinePurchase[]>([]);
  const [purchasedMap, setPurchasedMap] = useState<Record<string, number>>({});
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, { pharmacy_id: number; medicine_request_id: number; purchased: boolean; quantity?: number }>
  >({});
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const cacheKey = user ? `patient-prescriptions-${user.id}` : null;
  const isCompleted = prescription?.status === 'completed';

  const togglePharmacy = (pharmacyId: number) => {
    setExpandedPharmacies((prev) => ({
      ...prev,
      [pharmacyId]: !(prev[pharmacyId] ?? false)
    }));
  };

  useEffect(() => {
    const load = async () => {
      if (!cacheKey) {
        return;
      }

      const targetId = Number(id);
      let hasCachedMatch = false;
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
          if (Array.isArray(cachedData)) {
            const found = cachedData.find((p) => p.id === targetId) ?? null;
            if (found) {
              setPrescription(found);
              hasCachedMatch = true;
            }
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      if (!token) {
        return;
      }
      const data = await api.getPatientPrescriptions(token);
      localStorage.setItem(cacheKey, JSON.stringify(data));
      const fresh = data.find((p) => p.id === targetId) ?? null;
      if (fresh || !hasCachedMatch) {
        setPrescription(fresh);
      }
    };

    load().catch(() => undefined);
  }, [cacheKey, id, token]);

  useEffect(() => {
    api.getPharmacies().then(setPharmacies).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    api.getPatientFamilyMembers(token).then(setFamilyMembers).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token || !id) {
      return;
    }
    api
      .getPatientMedicinePurchases(token, Number(id))
      .then((rows) => {
        setPurchases(rows);
        const next: Record<string, number> = {};
        rows.forEach((row) => {
          next[`${row.pharmacy_id}-${row.medicine_request_id}`] = row.quantity > 0 ? row.quantity : 1;
        });
        setPurchasedMap(next);
      })
      .catch(() => undefined);
  }, [id, token]);

  useEffect(() => {
    if (!token || !id || isBatchSaving || isCompleted || Object.keys(pendingChanges).length === 0) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const snapshot = { ...pendingChanges };
      setIsBatchSaving(true);
      try {
        await api.setPatientMedicinePurchasesBatch(token, {
          prescription_id: Number(id),
          items: Object.values(snapshot)
        });
        const refreshed = await api.getPatientMedicinePurchases(token, Number(id));
        setPurchases(refreshed);
        setPendingChanges((prev) => {
          const next = { ...prev };
          Object.keys(snapshot).forEach((key) => {
            delete next[key];
          });
          return next;
        });
      } catch (error) {
        console.error('[PURCHASE BATCH] failed', error);
      } finally {
        setIsBatchSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [id, isBatchSaving, isCompleted, pendingChanges, token]);

  const setPurchased = (pharmacyId: number, medicineId: number, value: boolean, quantity?: number) => {
    if (isCompleted) {
      return;
    }
    const key = `${pharmacyId}-${medicineId}`;
    const nextQuantity = value ? Math.max(1, quantity ?? purchasedMap[key] ?? 1) : 0;

    setPurchasedMap((prev) => {
      const next = { ...prev };
      if (nextQuantity > 0) {
        next[key] = nextQuantity;
      } else {
        delete next[key];
      }
      return next;
    });

    setPendingChanges((prev) => ({
      ...prev,
      [key]: {
        pharmacy_id: pharmacyId,
        medicine_request_id: medicineId,
        purchased: nextQuantity > 0,
        quantity: nextQuantity > 0 ? nextQuantity : undefined
      }
    }));
  };

  const pharmacyAvailability = useMemo(() => {
    if (!prescription) {
      return [];
    }

    return pharmacies
      .map((pharmacy) => {
        const items = prescription.medicine_requests.map((medicine) => {
          const latestResponse = prescription.responses
            .filter(
              (response) =>
                response.pharmacy_id === pharmacy.id && response.medicine_request_id === medicine.id
            )
            .sort((a, b) => new Date(b.responded_at).getTime() - new Date(a.responded_at).getTime())[0];

          const isActive = latestResponse
            ? new Date(latestResponse.expires_at).getTime() > Date.now()
            : false;

          return { medicine, latestResponse, isActive };
        });

        const coverage = items.filter(
          (item) =>
            item.latestResponse &&
            item.latestResponse.status !== 'not_available' &&
            item.latestResponse.status !== 'out_of_stock'
        ).length;

        const latestConfirmation = items
          .filter((item) => item.latestResponse)
          .map((item) => item.latestResponse)
          .sort((a, b) => new Date(b.responded_at).getTime() - new Date(a.responded_at).getTime())[0];

        return { pharmacy, items, coverage, latestConfirmation };
      })
      .sort((a, b) => {
        if (b.coverage !== a.coverage) {
          return b.coverage - a.coverage;
        }
        if (b.pharmacy.reliability_score !== a.pharmacy.reliability_score) {
          return b.pharmacy.reliability_score - a.pharmacy.reliability_score;
        }
        return a.pharmacy.name.localeCompare(b.pharmacy.name, 'fr', { sensitivity: 'base' });
      });
  }, [pharmacies, prescription]);

  const purchasedTotalsByMedicine = useMemo(() => {
    const totals: Record<number, number> = {};
    Object.entries(purchasedMap).forEach(([key, qty]) => {
      const medicineId = Number(key.split('-')[1]);
      if (!Number.isFinite(medicineId)) {
        return;
      }
      totals[medicineId] = (totals[medicineId] ?? 0) + qty;
    });
    return totals;
  }, [purchasedMap]);

  const pickupHistory = useMemo(() => {
    if (!prescription) {
      return [];
    }
    return purchases
      .map((purchase) => {
        const pharmacy = pharmacies.find((p) => p.id === purchase.pharmacy_id);
        const med = prescription.medicine_requests.find((m) => m.id === purchase.medicine_request_id);
        return {
          id: purchase.id,
          pharmacyName: pharmacy?.name ?? `Pharmacie #${purchase.pharmacy_id}`,
          medicineName: med?.name ?? `Medicament #${purchase.medicine_request_id}`,
          quantity: purchase.quantity
        };
      })
      .sort((a, b) => a.pharmacyName.localeCompare(b.pharmacyName, 'fr', { sensitivity: 'base' }));
  }, [pharmacies, prescription, purchases]);

  const assignFamilyMember = async (familyMemberIdRaw: number | null) => {
    if (!token || !prescription) {
      return;
    }
    const updated = await api.assignFamilyMemberToPrescriptionAsPatient(
      token,
      prescription.id,
      familyMemberIdRaw
    );
    setPrescription(updated);
    if (cacheKey) {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as ApiPrescription[];
          if (Array.isArray(cached)) {
            const next = cached.map((item) => (item.id === updated.id ? updated : item));
            localStorage.setItem(cacheKey, JSON.stringify(next));
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }
  };

  const completePrescription = async () => {
    if (!token || !prescription) {
      return;
    }
    setIsCompleting(true);
    try {
      const updated = await api.completePrescriptionAsPatient(token, prescription.id);
      setPrescription(updated);
      if (cacheKey) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as ApiPrescription[];
            if (Array.isArray(cached)) {
              const next = cached.map((item) => (item.id === updated.id ? updated : item));
              localStorage.setItem(cacheKey, JSON.stringify(next));
            }
          } catch {
            localStorage.removeItem(cacheKey);
          }
        }
      }
    } catch (error) {
      console.error('[COMPLETE PRESCRIPTION] failed', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const reopenPrescription = async () => {
    if (!token || !prescription) {
      return;
    }
    setIsCompleting(true);
    try {
      const updated = await api.reopenPrescriptionAsPatient(token, prescription.id);
      setPrescription(updated);
      if (cacheKey) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as ApiPrescription[];
            if (Array.isArray(cached)) {
              const next = cached.map((item) => (item.id === updated.id ? updated : item));
              localStorage.setItem(cacheKey, JSON.stringify(next));
            }
          } catch {
            localStorage.removeItem(cacheKey);
          }
        }
      }
    } catch (error) {
      console.error('[REOPEN PRESCRIPTION] failed', error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/prescriptions" />
          </IonButtons>
          <IonTitle>Detail ordonnance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        {!prescription ? (
          <IonText color="medium">
            <p>Ordonnance introuvable.</p>
          </IonText>
        ) : (
          <>
            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={medkitOutline} color="success" />
                  <span>Dr. {prescription.doctor_name}</span>
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="status-row">
                  <span>Statut:</span>
                  <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                    {getPrescriptionStatusLabel(prescription.status)}
                  </IonBadge>
                </div>
                <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
                <IonItem lines="none">
                  <IonLabel position="stacked">Membre de famille</IonLabel>
                  <IonSelect
                    placeholder="Selectionner"
                    value={prescription.family_member_id ?? ''}
                    onIonChange={(event) =>
                      assignFamilyMember(event.detail.value === '' ? null : Number(event.detail.value)).catch(() => undefined)
                    }
                  >
                    <IonSelectOption value="">Aucun</IonSelectOption>
                    {familyMembers.map((member) => (
                      <IonSelectOption key={member.id} value={member.id}>
                        {member.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {!isCompleted ? (
                    <IonButton
                      size="small"
                      onClick={() => completePrescription().catch(() => undefined)}
                      disabled={isCompleting}
                    >
                      Marquer comme completee
                    </IonButton>
                  ) : (
                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={() => reopenPrescription().catch(() => undefined)}
                      disabled={isCompleting}
                    >
                      Reouvrir
                    </IonButton>
                  )}
                </div>
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>Medicaments</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {prescription.medicine_requests.map((med) => (
                    <IonItem key={med.id} lines="full">
                      <IonLabel>
                        <h3>{med.name}</h3>
                        <p>
                          {med.strength || 'Sans dosage'} · {med.form || 'Sans forme'}
                        </p>
                        <p>Quantite demandee: {med.quantity ?? 1}</p>
                        {med.expiry_date ? <p>Expiration: {med.expiry_date}</p> : null}
                        {med.duration_days ? <p>Duree: {med.duration_days} jour(s)</p> : null}
                        {med.daily_dosage ? <p>Dose journaliere: {med.daily_dosage} fois/jour</p> : null}
                        {med.notes ? <p>Notes: {med.notes}</p> : null}
                        <p>Quantite achetee: {purchasedTotalsByMedicine[med.id] ?? 0}</p>
                        <p>
                          Quantite restante:{' '}
                          {Math.max(0, (med.quantity ?? 1) - (purchasedTotalsByMedicine[med.id] ?? 0))}
                        </p>
                        <p>
                          Generique: {med.generic_allowed ? 'Oui' : 'Non'} · Conversion:{' '}
                          {med.conversion_allowed ? 'Oui' : 'Non'}
                        </p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>Disponibilite en pharmacie</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {pharmacyAvailability.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucune pharmacie disponible pour le moment.</p>
                  </IonText>
                ) : (
                  pharmacyAvailability.map(({ pharmacy, items, coverage, latestConfirmation }) => (
                    <IonCard key={pharmacy.id} className="surface-card" style={{ marginTop: '12px' }}>
                      <IonCardContent>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <p style={{ margin: 0 }}>
                            <strong>{pharmacy.name}</strong>
                            <IonBadge
                              color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}
                              style={{ marginLeft: '8px' }}
                            >
                              {pharmacy.temporary_closed ? 'Fermeture temporaire' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                            </IonBadge>
                          </p>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <IonButton
                              size="small"
                              fill="clear"
                              disabled={!pharmacy.phone}
                              href={pharmacy.phone ? `tel:${pharmacy.phone}` : undefined}
                            >
                              <IonIcon icon={callOutline} />
                            </IonButton>
                            <IonButton
                              size="small"
                              fill="clear"
                              disabled={!pharmacy.phone}
                              href={
                                pharmacy.phone
                                  ? `https://wa.me/${pharmacy.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Bonjour, je viens via l'application pour l'ordonnance #${prescription.id}.`
                                    )}`
                                  : undefined
                              }
                            >
                              <IonIcon icon={logoWhatsapp} />
                            </IonButton>
                          </div>
                        </div>
                        <p>
                          Couverture: {coverage} / {prescription.medicine_requests.length}
                        </p>
                        {pharmacy.address ? <p>Adresse: {pharmacy.address}</p> : null}
                        <p>
                          {pharmacy.closes_at ? `Ferme a ${pharmacy.closes_at} · ` : ''}
                          {pharmacy.last_status_updated_at
                            ? `Mis a jour il y a ${minutesAgo(pharmacy.last_status_updated_at)} min`
                            : 'Derniere mise a jour inconnue'}
                        </p>
                        {pharmacy.emergency_available ? <IonBadge color="warning">Urgence disponible</IonBadge> : null}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                          <IonButton
                            size="small"
                            fill="outline"
                            onClick={() => togglePharmacy(pharmacy.id)}
                          >
                            {expandedPharmacies[pharmacy.id] ?? false ? 'Masquer' : 'Afficher'}
                          </IonButton>
                        </div>
                        {(expandedPharmacies[pharmacy.id] ?? false) ? (
                          <>
                        <p>
                          Achetes ici:{' '}
                          {items.filter((item) => (purchasedMap[`${pharmacy.id}-${item.medicine.id}`] ?? 0) > 0).length}
                        </p>
                        {latestConfirmation ? (
                          <p>
                            Confirme il y a {minutesAgo(latestConfirmation.responded_at)} min ·
                            {new Date(latestConfirmation.expires_at).getTime() > Date.now()
                              ?
                              ` expire dans ${minutesUntil(latestConfirmation.expires_at)} min`
                              : ' expiree'}
                          </p>
                        ) : (
                          <p>Aucune confirmation</p>
                        )}
                        {latestConfirmation && new Date(latestConfirmation.expires_at).getTime() > Date.now() && minutesUntil(latestConfirmation.expires_at) <= 10 ? (
                          <IonBadge color="warning">Alerte: expiration bientot</IonBadge>
                        ) : null}

                        <IonList>
                          {items.map((item) => {
                            const key = `${pharmacy.id}-${item.medicine.id}`;
                            const currentQty = purchasedMap[key] ?? 0;
                            return (
                              <IonItem key={item.medicine.id} lines="none">
                                <IonLabel>
                                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <strong style={{ flex: '1 1 90%' }}>{item.medicine.name}</strong>
                                    <IonCheckbox
                                      style={{ marginLeft: 'auto' }}
                                      checked={currentQty > 0}
                                      disabled={isCompleted}
                                      onIonChange={(event) => {
                                        if (event.detail.checked) {
                                          setPurchased(pharmacy.id, item.medicine.id, true, currentQty > 0 ? currentQty : 1);
                                        } else {
                                          setPurchased(pharmacy.id, item.medicine.id, false);
                                        }
                                      }}
                                    />
                                  </div>
                                  <p>
                                    {(item.medicine.form || 'Sans forme')} · {(item.medicine.strength || 'Sans dosage')} ·{' '}
                                    <span style={{ fontSize: '0.92rem', color: 'var(--app-text-soft)' }}>
                                      {item.latestResponse
                                        ? item.isActive
                                          ? availabilityLabel[item.latestResponse.status]
                                          : 'Expiree'
                                        : 'Pas de reponse'}
                                    </span>
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ fontSize: '0.82rem' }}>QUANTITE :</strong>
                                    <IonButton
                                      size="small"
                                      fill="outline"
                                      disabled={isCompleted || currentQty <= 0}
                                      onClick={() => {
                                        if (currentQty <= 1) {
                                          setPurchased(pharmacy.id, item.medicine.id, false);
                                          return;
                                        }
                                        setPurchased(pharmacy.id, item.medicine.id, true, currentQty - 1);
                                      }}
                                    >
                                      -
                                    </IonButton>
                                    <IonInput
                                      type="number"
                                      min="0"
                                      inputmode="numeric"
                                      value={String(currentQty)}
                                      style={{ width: '64px', textAlign: 'center' }}
                                      disabled={isCompleted}
                                      onIonInput={(event) => {
                                        const raw = (event.detail.value ?? '').trim();
                                        if (raw === '') {
                                          setPurchased(pharmacy.id, item.medicine.id, false);
                                          return;
                                        }
                                        const parsed = Number(raw);
                                        if (!Number.isFinite(parsed) || parsed < 0) {
                                          return;
                                        }
                                        const nextQty = Math.floor(parsed);
                                        if (nextQty <= 0) {
                                          setPurchased(pharmacy.id, item.medicine.id, false);
                                          return;
                                        }
                                        setPurchased(pharmacy.id, item.medicine.id, true, nextQty);
                                      }}
                                    />
                                    <IonButton
                                      size="small"
                                      fill="outline"
                                      disabled={isCompleted}
                                      onClick={() => setPurchased(pharmacy.id, item.medicine.id, true, currentQty + 1 || 1)}
                                    >
                                      +
                                    </IonButton>
                                  </div>
                                </IonLabel>
                              </IonItem>
                            );
                          })}
                        </IonList>
                          </>
                        ) : null}
                      </IonCardContent>
                    </IonCard>
                  ))
                )}
              </IonCardContent>
            </IonCard>
            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>Historique des achats</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {pickupHistory.length === 0 ? (
                  <IonText color="medium">Aucun achat enregistre.</IonText>
                ) : (
                  <IonList>
                    {pickupHistory.map((entry) => (
                      <IonItem key={entry.id} lines="full">
                        <IonLabel>
                          <h3>{entry.pharmacyName}</h3>
                          <p>{entry.medicineName}</p>
                          <p>Quantite: {entry.quantity}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PatientPrescriptionDetailPage;
