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
  temperature_c: number | null;
  spo2: number | null;
  glucose_mg_dl: number | null;
  weight_kg: number | null;
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

const PatientVitalSignsPage: React.FC = () => {
  const { user } = useAuth();
  const storageKey = useMemo(() => `patient-vitals-${user?.id ?? 'anonymous'}`, [user?.id]);

  const [entries, setEntries] = useState<VitalSignEntry[]>([]);
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [spo2, setSpo2] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');
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
      temp: avg(recent.map((r) => r.temperature_c)),
      spo2: avg(recent.map((r) => r.spo2)),
      glucose: avg(recent.map((r) => r.glucose_mg_dl)),
      weight: avg(recent.map((r) => r.weight_kg)),
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
      temperature_c: parseNum(temperatureC),
      spo2: parseNum(spo2),
      glucose_mg_dl: parseNum(glucose),
      weight_kg: parseNum(weight),
      note: note.trim(),
    };

    if (
      newEntry.systolic === null &&
      newEntry.diastolic === null &&
      newEntry.heart_rate === null &&
      newEntry.temperature_c === null &&
      newEntry.spo2 === null &&
      newEntry.glucose_mg_dl === null &&
      newEntry.weight_kg === null
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
    setTemperatureC('');
    setSpo2('');
    setGlucose('');
    setWeight('');
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
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Temperature</div>
                  <div style={{ fontWeight: 700 }}>{latest.temperature_c ?? '-'} C</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>SpO2</div>
                  <div style={{ fontWeight: 700 }}>{latest.spo2 ?? '-'} %</div>
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
              <IonBadge color="light">Moy. 7j FC {sevenDayAvg.hr ?? '-'} bpm</IonBadge>
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
                <IonLabel position="stacked">Poids (kg)</IonLabel>
                <IonInput value={weight} onIonInput={(e) => setWeight(e.detail.value ?? '')} />
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
                            TA {entry.systolic ?? '-'} / {entry.diastolic ?? '-'} · FC {entry.heart_rate ?? '-'} · Temp {entry.temperature_c ?? '-'} C
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            SpO2 {entry.spo2 ?? '-'}% · Glycemie {entry.glucose_mg_dl ?? '-'} · Poids {entry.weight_kg ?? '-'} kg
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
