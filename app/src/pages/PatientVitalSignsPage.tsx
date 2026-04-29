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
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { pulseOutline, trashOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type VitalSignEntry = {
  id: number;
  recorded_at: string;
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature_c: number | null;
  spo2: number | null;
  glucose_mg_dl: number | null;
  glucose_context: 'fasting' | 'post_meal' | 'random' | null;
  weight_kg: number | null;
  height_cm: number | null;
  pain_score: number | null;
  measurement_context: 'rest' | 'after_exercise' | 'symptomatic' | null;
  note: string;
};

const parseNum = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const pressureStatus = (s: number | null, d: number | null) => {
  if (s === null || d === null) return { label: 'N/D', color: 'medium' as const };
  if (s >= 140 || d >= 90) return { label: 'Elevee', color: 'danger' as const };
  if (s < 90 || d < 60) return { label: 'Basse', color: 'warning' as const };
  return { label: 'Normale', color: 'success' as const };
};

const heartRateStatus = (hr: number | null) => {
  if (hr === null) return { label: 'N/D', color: 'medium' as const };
  if (hr > 100 || hr < 50) return { label: 'A surveiller', color: 'warning' as const };
  return { label: 'Normale', color: 'success' as const };
};

const spo2Status = (value: number | null) => {
  if (value === null) return { label: 'N/D', color: 'medium' as const };
  if (value < 90) return { label: 'Basse', color: 'danger' as const };
  if (value < 95) return { label: 'Limite', color: 'warning' as const };
  return { label: 'Normale', color: 'success' as const };
};

const temperatureStatus = (value: number | null) => {
  if (value === null) return { label: 'N/D', color: 'medium' as const };
  if (value < 36) return { label: 'Basse', color: 'warning' as const };
  if (value <= 37.8) return { label: 'Normale', color: 'success' as const };
  return { label: 'Elevee', color: 'danger' as const };
};

const respiratoryStatus = (value: number | null) => {
  if (value === null) return { label: 'N/D', color: 'medium' as const };
  if (value < 12 || value > 20) return { label: 'A surveiller', color: 'warning' as const };
  return { label: 'Normale', color: 'success' as const };
};

const painStatus = (value: number | null) => {
  if (value === null) return { label: 'N/D', color: 'medium' as const };
  if (value <= 3) return { label: 'Legere', color: 'success' as const };
  if (value <= 6) return { label: 'Moderee', color: 'warning' as const };
  return { label: 'Importante', color: 'danger' as const };
};

const glucoseStatus = (value: number | null, context: VitalSignEntry['glucose_context']) => {
  if (value === null) return { label: 'N/D', color: 'medium' as const };
  if (context === 'fasting') {
    if (value < 70) return { label: 'Basse', color: 'warning' as const };
    if (value < 100) return { label: 'Normale', color: 'success' as const };
    if (value <= 125) return { label: 'A surveiller', color: 'warning' as const };
    return { label: 'Elevee', color: 'danger' as const };
  }
  if (context === 'post_meal') {
    if (value < 70) return { label: 'Basse', color: 'warning' as const };
    if (value < 140) return { label: 'Normale', color: 'success' as const };
    return { label: 'Elevee', color: 'danger' as const };
  }
  if (value < 70) return { label: 'Basse', color: 'warning' as const };
  if (value <= 180) return { label: 'A surveiller', color: 'warning' as const };
  return { label: 'Elevee', color: 'danger' as const };
};

const bmiStatus = (weightKg: number | null, heightCm: number | null) => {
  if (weightKg === null || heightCm === null || heightCm <= 0) {
    return { bmi: null as number | null, label: 'N/D', color: 'medium' as const };
  }
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  if (bmi < 18.5) return { bmi, label: 'Insuffisance ponderale', color: 'warning' as const };
  if (bmi < 25) return { bmi, label: 'Poids normal', color: 'success' as const };
  if (bmi < 30) return { bmi, label: 'Surpoids', color: 'warning' as const };
  return { bmi, label: 'Obesite', color: 'danger' as const };
};

const PatientVitalSignsPage: React.FC = () => {
  const { user } = useAuth();
  const storageKey = useMemo(() => `patient-vitals-${user?.id ?? 'anonymous'}`, [user?.id]);

  const [entries, setEntries] = useState<VitalSignEntry[]>([]);
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [spo2, setSpo2] = useState('');
  const [glucose, setGlucose] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<VitalSignEntry['glucose_context']>('random');
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [painScore, setPainScore] = useState('');
  const [measurementContext, setMeasurementContext] = useState<VitalSignEntry['measurement_context']>('rest');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setEntries([]);
        return;
      }
      const parsed = JSON.parse(raw) as VitalSignEntry[];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }, [storageKey]);

  const latest = useMemo(() => entries[0] ?? null, [entries]);
  const latestBmi = useMemo(
    () => bmiStatus(latest?.weight_kg ?? null, latest?.height_cm ?? null),
    [latest?.height_cm, latest?.weight_kg]
  );
  const latestGlucose = useMemo(
    () => glucoseStatus(latest?.glucose_mg_dl ?? null, latest?.glucose_context ?? 'random'),
    [latest?.glucose_context, latest?.glucose_mg_dl]
  );

  const sevenDayAvg = useMemo(() => {
    const now = Date.now();
    const limit = 7 * 24 * 60 * 60 * 1000;
    const recent = entries.filter((entry) => {
      const ts = new Date(entry.recorded_at).getTime();
      return Number.isFinite(ts) && now - ts <= limit;
    });
    const avg = (values: Array<number | null>) => {
      const valid = values.filter((v): v is number => typeof v === 'number');
      if (!valid.length) return null;
      return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1));
    };
    return {
      pressureS: avg(recent.map((r) => r.systolic)),
      pressureD: avg(recent.map((r) => r.diastolic)),
      hr: avg(recent.map((r) => r.heart_rate)),
      rr: avg(recent.map((r) => r.respiratory_rate)),
      temp: avg(recent.map((r) => r.temperature_c)),
      spo2: avg(recent.map((r) => r.spo2)),
      glucose: avg(recent.map((r) => r.glucose_mg_dl)),
      weight: avg(recent.map((r) => r.weight_kg)),
      height: avg(recent.map((r) => r.height_cm)),
    };
  }, [entries]);

  const persistEntries = (next: VitalSignEntry[]) => {
    setEntries(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addEntry = () => {
    if (!recordedAt) {
      setMessage('Date/heure requise.');
      return;
    }
    const newEntry: VitalSignEntry = {
      id: Date.now(),
      recorded_at: new Date(recordedAt).toISOString(),
      systolic: parseNum(systolic),
      diastolic: parseNum(diastolic),
      heart_rate: parseNum(heartRate),
      respiratory_rate: parseNum(respiratoryRate),
      temperature_c: parseNum(temperatureC),
      spo2: parseNum(spo2),
      glucose_mg_dl: parseNum(glucose),
      glucose_context: glucoseContext ?? 'random',
      weight_kg: parseNum(weight),
      height_cm: parseNum(heightCm),
      pain_score: parseNum(painScore),
      measurement_context: measurementContext ?? 'rest',
      note: note.trim(),
    };

    if (
      newEntry.systolic === null &&
      newEntry.diastolic === null &&
      newEntry.heart_rate === null &&
      newEntry.respiratory_rate === null &&
      newEntry.temperature_c === null &&
      newEntry.spo2 === null &&
      newEntry.glucose_mg_dl === null &&
      newEntry.weight_kg === null &&
      newEntry.height_cm === null
      && newEntry.pain_score === null
    ) {
      setMessage('Ajoutez au moins une mesure.');
      return;
    }

    const next = [newEntry, ...entries].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
    );
    persistEntries(next);
    setRecordedAt(new Date().toISOString().slice(0, 16));
    setSystolic('');
    setDiastolic('');
    setHeartRate('');
    setRespiratoryRate('');
    setTemperatureC('');
    setSpo2('');
    setGlucose('');
    setGlucoseContext('random');
    setWeight('');
    setHeightCm('');
    setPainScore('');
    setMeasurementContext('rest');
    setNote('');
    setMessage('Mesure enregistree.');
  };

  const removeEntry = (id: number) => {
    const next = entries.filter((entry) => entry.id !== id);
    persistEntries(next);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Signes vitaux</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={pulseOutline} />
              Apercu rapide
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {latest ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Derniere tension</div>
                  <div style={{ fontWeight: 700 }}>{latest.systolic ?? '-'} / {latest.diastolic ?? '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Pouls</div>
                  <div style={{ fontWeight: 700 }}>{latest.heart_rate ?? '-'} bpm</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Frequence respiratoire</div>
                  <div style={{ fontWeight: 700 }}>{latest.respiratory_rate ?? '-'} /min</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Temperature</div>
                  <div style={{ fontWeight: 700 }}>{latest.temperature_c ?? '-'} C</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>SpO2</div>
                  <div style={{ fontWeight: 700 }}>{latest.spo2 ?? '-'} %</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Glycemie</div>
                  <div style={{ fontWeight: 700 }}>{latest.glucose_mg_dl ?? '-'} mg/dL</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Poids</div>
                  <div style={{ fontWeight: 700 }}>{latest.weight_kg ?? '-'} kg</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Taille</div>
                  <div style={{ fontWeight: 700 }}>{latest.height_cm ?? '-'} cm</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Douleur (0-10)</div>
                  <div style={{ fontWeight: 700 }}>{latest.pain_score ?? '-'}</div>
                </div>
              </div>
            ) : (
              <IonText color="medium">
                <p>Aucune mesure pour le moment.</p>
              </IonText>
            )}
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <IonBadge color={pressureStatus(latest?.systolic ?? null, latest?.diastolic ?? null).color}>
                Tension {pressureStatus(latest?.systolic ?? null, latest?.diastolic ?? null).label}
              </IonBadge>
              <IonBadge color={heartRateStatus(latest?.heart_rate ?? null).color}>
                Pouls {heartRateStatus(latest?.heart_rate ?? null).label}
              </IonBadge>
              <IonBadge color={respiratoryStatus(latest?.respiratory_rate ?? null).color}>
                Respiration {respiratoryStatus(latest?.respiratory_rate ?? null).label}
              </IonBadge>
              <IonBadge color={temperatureStatus(latest?.temperature_c ?? null).color}>
                Temperature {temperatureStatus(latest?.temperature_c ?? null).label}
              </IonBadge>
              <IonBadge color={spo2Status(latest?.spo2 ?? null).color}>
                SpO2 {spo2Status(latest?.spo2 ?? null).label}
              </IonBadge>
              <IonBadge color={latestGlucose.color}>
                Glycemie {latestGlucose.label}
              </IonBadge>
              <IonBadge color={latestBmi.color}>
                IMC {latestBmi.bmi ?? '-'} · {latestBmi.label}
              </IonBadge>
              <IonBadge color={painStatus(latest?.pain_score ?? null).color}>
                Douleur {painStatus(latest?.pain_score ?? null).label}
              </IonBadge>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Nouvelle mesure</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Date et heure</IonLabel>
              <IonInput type="datetime-local" value={recordedAt} onIonInput={(e) => setRecordedAt(e.detail.value ?? '')} />
            </IonItem>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '8px' }}>
              <IonItem>
                <IonLabel position="stacked">Systolique</IonLabel>
                <IonInput value={systolic} onIonInput={(e) => setSystolic(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Diastolique</IonLabel>
                <IonInput value={diastolic} onIonInput={(e) => setDiastolic(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Frequence cardiaque</IonLabel>
                <IonInput value={heartRate} onIonInput={(e) => setHeartRate(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Frequence respiratoire (/min)</IonLabel>
                <IonInput value={respiratoryRate} onIonInput={(e) => setRespiratoryRate(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Temperature (C)</IonLabel>
                <IonInput value={temperatureC} onIonInput={(e) => setTemperatureC(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">SpO2 (%)</IonLabel>
                <IonInput value={spo2} onIonInput={(e) => setSpo2(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Glycemie (mg/dL)</IonLabel>
                <IonInput value={glucose} onIonInput={(e) => setGlucose(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Contexte glycemie</IonLabel>
                <IonSelect value={glucoseContext} onIonChange={(e) => setGlucoseContext((e.detail.value as VitalSignEntry['glucose_context']) ?? 'random')}>
                  <IonSelectOption value="fasting">A jeun</IonSelectOption>
                  <IonSelectOption value="post_meal">Post-prandiale (2h)</IonSelectOption>
                  <IonSelectOption value="random">Aleatoire</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Poids (kg)</IonLabel>
                <IonInput value={weight} onIonInput={(e) => setWeight(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Taille (cm)</IonLabel>
                <IonInput value={heightCm} onIonInput={(e) => setHeightCm(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Douleur (0-10)</IonLabel>
                <IonInput value={painScore} onIonInput={(e) => setPainScore(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Contexte mesure</IonLabel>
                <IonSelect value={measurementContext} onIonChange={(e) => setMeasurementContext((e.detail.value as VitalSignEntry['measurement_context']) ?? 'rest')}>
                  <IonSelectOption value="rest">Repos</IonSelectOption>
                  <IonSelectOption value="after_exercise">Apres effort</IonSelectOption>
                  <IonSelectOption value="symptomatic">Symptomatique</IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>
            <IonItem style={{ marginTop: '8px' }}>
              <IonLabel position="stacked">Note</IonLabel>
              <IonTextarea autoGrow value={note} onIonInput={(e) => setNote(e.detail.value ?? '')} />
            </IonItem>
            <IonButton expand="block" style={{ marginTop: '10px' }} onClick={addEntry}>
              Enregistrer la mesure
            </IonButton>
            {message ? (
              <IonText color="medium">
                <p style={{ marginTop: '8px' }}>{message}</p>
              </IonText>
            ) : null}
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Historique</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {entries.length === 0 ? (
              <IonText color="medium">
                <p>Aucune entree.</p>
              </IonText>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map((entry) => (
                  <IonCard key={entry.id} style={{ margin: 0, border: '1px solid #dbe7ef' }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {formatDateTime(entry.recorded_at)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                            TA {entry.systolic ?? '-'} / {entry.diastolic ?? '-'} · FC {entry.heart_rate ?? '-'} · FR {entry.respiratory_rate ?? '-'} · Temp {entry.temperature_c ?? '-'} C
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            SpO2 {entry.spo2 ?? '-'}% · Glycemie {entry.glucose_mg_dl ?? '-'} ({entry.glucose_context === 'fasting' ? 'A jeun' : entry.glucose_context === 'post_meal' ? 'Post-prandiale' : 'Aleatoire'}) · Poids {entry.weight_kg ?? '-'} kg · Taille {entry.height_cm ?? '-'} cm · Douleur {entry.pain_score ?? '-'} · Contexte {entry.measurement_context === 'after_exercise' ? 'Apres effort' : entry.measurement_context === 'symptomatic' ? 'Symptomatique' : 'Repos'}
                          </div>
                          {entry.note ? (
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                              Note: {entry.note}
                            </div>
                          ) : null}
                        </div>
                        <IonButton fill="clear" color="danger" onClick={() => removeEntry(entry.id)}>
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PatientVitalSignsPage;
