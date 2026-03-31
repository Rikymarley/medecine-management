import {
  IonBackButton,
  IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiMedicine, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';

const emptyMedicine = () => ({
  name: '',
  strength: '',
  form: '',
  quantity: 1,
  genericAllowed: true,
  conversionAllowed: false
});

type DraftMedicine = ReturnType<typeof emptyMedicine>;

const DoctorCreatePrescriptionPage: React.FC = () => {
  const location = useLocation();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [patientName, setPatientName] = useState('');
  const [medicines, setMedicines] = useState<DraftMedicine[]>([emptyMedicine()]);
  const [medicineSuggestions, setMedicineSuggestions] = useState<Record<number, ApiMedicine[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const medicineDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefilledPatient = params.get('patient');
    if (prefilledPatient) {
      setPatientName(prefilledPatient);
    }
  }, [location.search]);

  const loadPrescriptionsFromApi = async () => {
    if (!token) {
      return;
    }
    const data = await api.getDoctorPrescriptions(token);
    setPrescriptions(data);
    if (cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    }
  };

  useEffect(() => {
    if (!cacheKey) {
      return;
    }

    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          setPrescriptions(cachedData);
          return;
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    loadPrescriptionsFromApi().catch(() => undefined);
  }, [cacheKey, token]);

  const addMedicine = () => setMedicines((prev) => [...prev, emptyMedicine()]);

  const updateMedicine = (index: number, patch: Partial<DraftMedicine>) => {
    setMedicines((prev) => prev.map((med, idx) => (idx === index ? { ...med, ...patch } : med)));
  };

  const updateMedicineName = (index: number, value: string) => {
    updateMedicine(index, { name: value });

    const query = value.trim();
    if (medicineDebounceRef.current[index]) {
      clearTimeout(medicineDebounceRef.current[index]);
    }

    if (!query) {
      setMedicineSuggestions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    medicineDebounceRef.current[index] = setTimeout(() => {
      api
        .getMedicines({ q: query, limit: 5 })
        .then((rows) => {
          setMedicineSuggestions((prev) => ({ ...prev, [index]: rows }));
        })
        .catch(() => {
          setMedicineSuggestions((prev) => ({ ...prev, [index]: [] }));
        });
    }, 250);
  };

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, idx) => idx !== index));
    setMedicineSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  useEffect(() => {
    return () => {
      Object.values(medicineDebounceRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const submitPrescription = async () => {
    const filtered = medicines.filter((med) => med.name.trim());
    if (!patientName.trim() || filtered.length === 0) {
      return;
    }

    if (!token) {
      setError('Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        patient_name: patientName.trim(),
        medicine_requests: filtered.map((med) => ({
          name: med.name,
          strength: med.strength || null,
          form: med.form || null,
          quantity: med.quantity > 0 ? med.quantity : 1,
          generic_allowed: med.genericAllowed,
          conversion_allowed: med.conversionAllowed
        }))
      };
      console.log('[CREATE PRESCRIPTION] payload', payload);
      await api.createPrescription(token, {
        patient_name: payload.patient_name,
        medicine_requests: payload.medicine_requests
      });
      console.log('[CREATE PRESCRIPTION] success');
      await loadPrescriptionsFromApi();
      setPatientName('');
      setMedicines([emptyMedicine()]);
    } catch (err) {
      console.error('[CREATE PRESCRIPTION] failed', err);
      setError(err instanceof Error ? err.message : "Echec de creation de l'ordonnance");
    } finally {
      setLoading(false);
    }
  };

  const patientSuggestions = useMemo(() => {
    const unique = Array.from(new Set(prescriptions.map((p) => p.patient_name.trim()).filter(Boolean)));
    const query = patientName.trim().toLowerCase();
    if (!query) {
      return [];
    }
    return unique
      .filter((name) => name.toLowerCase().includes(query) && name.toLowerCase() !== query)
      .slice(0, 5);
  }, [prescriptions, patientName]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Creer une ordonnance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Nouvelle ordonnance</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Nom du patient</IonLabel>
              <IonInput
                value={patientName}
                placeholder="Marie Jean"
                onIonInput={(event) => setPatientName(event.detail.value ?? '')}
              />
            </IonItem>
            {patientSuggestions.length > 0 ? (
              <IonList inset>
                {patientSuggestions.map((name) => (
                  <IonItem
                    key={name}
                    button
                    detail={false}
                    lines="none"
                    onClick={() => setPatientName(name)}
                  >
                    <IonLabel>{name}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            ) : null}

            <IonText className="ion-padding-top">
              Medicaments (une demande par medicament)
            </IonText>

            <IonList>
              {medicines.map((med, index) => (
                <IonCard key={`${index}`} className="surface-card" style={{ marginTop: '12px' }}>
                  <IonCardContent>
                    <IonItem>
                      <IonLabel position="stacked">Nom du medicament</IonLabel>
                      <IonInput
                        value={med.name}
                        placeholder="Amoxicillin"
                        onIonInput={(event) => updateMedicineName(index, event.detail.value ?? '')}
                      />
                    </IonItem>
                    {med.name.trim() && (medicineSuggestions[index] ?? []).length > 0 ? (
                      <IonList inset>
                        {(medicineSuggestions[index] ?? []).map((suggestion) => (
                            <IonItem
                              key={`${index}-${suggestion.id}`}
                              button
                              detail={false}
                              lines="none"
                              onClick={() => {
                                updateMedicine(index, {
                                  name: suggestion.name,
                                  strength: suggestion.strength ?? med.strength,
                                  form: suggestion.form ?? med.form
                                });
                                setMedicineSuggestions((prev) => ({ ...prev, [index]: [] }));
                              }}
                            >
                              <IonLabel>
                                {suggestion.name}
                                <p>
                                  {suggestion.strength || 'Sans dosage'} · {suggestion.form || 'Sans forme'} ·{' '}
                                  {suggestion.category}
                                </p>
                              </IonLabel>
                            </IonItem>
                          ))}
                      </IonList>
                    ) : null}
                    <IonItem>
                      <IonLabel position="stacked">Dosage</IonLabel>
                      <IonInput
                        value={med.strength}
                        placeholder="500mg"
                        onIonInput={(event) => updateMedicine(index, { strength: event.detail.value ?? '' })}
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Forme</IonLabel>
                      <IonInput
                        value={med.form}
                        placeholder="Capsule"
                        onIonInput={(event) => updateMedicine(index, { form: event.detail.value ?? '' })}
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Quantite</IonLabel>
                      <IonInput
                        type="number"
                        min="1"
                        value={med.quantity}
                        placeholder="1"
                        onIonInput={(event) => {
                          const value = Number(event.detail.value);
                          updateMedicine(index, { quantity: Number.isFinite(value) && value > 0 ? value : 1 });
                        }}
                      />
                    </IonItem>
                    <IonItem lines="full">
                      <IonLabel>Generique autorise</IonLabel>
                      <IonToggle
                        checked={med.genericAllowed}
                        onIonChange={(event) =>
                          updateMedicine(index, { genericAllowed: event.detail.checked })
                        }
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel>Conversion dosage/forme</IonLabel>
                      <IonToggle
                        checked={med.conversionAllowed}
                        onIonChange={(event) =>
                          updateMedicine(index, { conversionAllowed: event.detail.checked })
                        }
                      />
                    </IonItem>
                    {medicines.length > 1 ? (
                      <IonButton
                        expand="block"
                        fill="outline"
                        color="medium"
                        onClick={() => removeMedicine(index)}
                      >
                        Retirer le medicament
                      </IonButton>
                    ) : null}
                  </IonCardContent>
                </IonCard>
              ))}
            </IonList>

            <IonButton expand="block" fill="outline" onClick={addMedicine}>
              Ajouter un autre medicament
            </IonButton>
            {error ? (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            ) : null}
            <IonButton expand="block" onClick={submitPrescription} disabled={loading}>
              Publier la demande d'ordonnance
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default DoctorCreatePrescriptionPage;
