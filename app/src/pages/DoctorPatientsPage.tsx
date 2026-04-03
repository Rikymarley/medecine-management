import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiFamilyMember, ApiPatientLookup, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateHaiti } from '../utils/time';

const DoctorPatientsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [familyMembersByPatient, setFamilyMembersByPatient] = useState<Record<string, ApiFamilyMember[]>>({});
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSearchResults, setDbSearchResults] = useState<ApiPatientLookup[]>([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;

  const loadPrescriptions = useCallback(async () => {
    if (!cacheKey) {
      return;
    }

    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
        if (Array.isArray(cachedData)) {
          setPrescriptions(cachedData);
          if (cachedData.length > 0) {
            return;
          }
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    if (!token) {
      return;
    }
    const data = await api.getDoctorPrescriptions(token);
    setPrescriptions(data);
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }, [cacheKey, token]);

  useEffect(() => {
    loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  useIonViewWillEnter(() => {
    loadPrescriptions().catch(() => undefined);
  });

  useEffect(() => {
    if (!token || prescriptions.length === 0) {
      setFamilyMembersByPatient({});
      return;
    }

    const patientMap = new Map<number, string>();
    prescriptions.forEach((p) => {
      if (p.patient_user_id) {
        patientMap.set(p.patient_user_id, p.patient_name);
      }
    });

    if (patientMap.size === 0) {
      setFamilyMembersByPatient({});
      return;
    }

    Promise.all(
      Array.from(patientMap.entries()).map(async ([patientUserId, patientName]) => {
        const members = await api.getDoctorPatientFamilyMembers(token, patientUserId).catch(() => []);
        return [patientName, members] as const;
      })
    )
      .then((rows) => {
        const next: Record<string, ApiFamilyMember[]> = {};
        rows.forEach(([patientName, members]) => {
          next[patientName] = members;
        });
        setFamilyMembersByPatient(next);
      })
      .catch(() => setFamilyMembersByPatient({}));
  }, [prescriptions, token]);

  useEffect(() => {
    const query = dbSearchQuery.trim();
    if (!token || query.length < 2) {
      setDbSearchResults([]);
      setSearchingDb(false);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchingDb(true);
      api
        .searchDoctorPatients(token, query, 10)
        .then((rows) => setDbSearchResults(rows))
        .catch(() => setDbSearchResults([]))
        .finally(() => setSearchingDb(false));
    }, 250);
  }, [dbSearchQuery, token]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const patientEntries = useMemo(() => {
    const patients = Array.from(new Set(prescriptions.map((p) => p.patient_name.trim()).filter(Boolean))).map((name) => ({
      key: `patient-${name}`,
      label: name,
      patientName: name,
      familyMemberId: null as number | null,
      subtitle: 'Patient'
    }));

    const familyEntries = Object.entries(familyMembersByPatient).flatMap(([patientName, members]) =>
      members.map((member) => ({
        key: `family-${member.id}`,
        label: member.name,
        patientName,
        familyMemberId: member.id,
        subtitle: `Membre de ${patientName}`
      }))
    );

    return [...patients, ...familyEntries].sort((a, b) =>
      a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );
  }, [familyMembersByPatient, prescriptions]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Liste des patients</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Patients (A-Z)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonSearchbar
              value={dbSearchQuery}
              placeholder="Rechercher un patient dans la base (nom, telephone, NINU)"
              onIonInput={(e) => setDbSearchQuery(e.detail.value ?? '')}
            />
            {searchingDb ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : null}
            {dbSearchQuery.trim().length >= 2 ? (
              <>
                {dbSearchResults.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucun patient trouve dans la base pour cette recherche.</p>
                  </IonText>
                ) : (
                  <IonList inset>
                    {dbSearchResults.map((row) => (
                      <IonItem
                        key={`db-${row.id}`}
                        lines="full"
                        button
                        detail
                        onClick={() =>
                          ionRouter.push(
                            `/doctor/patients/${encodeURIComponent(row.name)}`,
                            'forward',
                            'push'
                          )
                        }
                      >
                        <IonLabel>
                          <h3>{row.name}</h3>
                          <p>
                            {row.phone ? `Tel: ${row.phone}` : 'Tel: non renseigne'} ·{' '}
                            {row.ninu ? `NINU: ${row.ninu}` : 'NINU: non renseigne'}
                            {row.date_of_birth ? ` · Nais: ${formatDateHaiti(row.date_of_birth)}` : ''}
                          </p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </>
            ) : null}
            {patientEntries.length === 0 ? (
              <IonText color="medium">
                <p>Aucun patient pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {patientEntries.map((entry) => (
                  <IonItem
                    key={entry.key}
                    lines="full"
                    button
                    detail
                    onClick={() =>
                      ionRouter.push(
                        `/doctor/patients/${encodeURIComponent(entry.patientName)}${
                          entry.familyMemberId
                            ? `?familyMemberId=${entry.familyMemberId}&familyMemberName=${encodeURIComponent(entry.label)}`
                            : ''
                        }`,
                        'forward',
                        'push'
                      )
                    }
                  >
                    <IonLabel>
                      <h3>{entry.label}</h3>
                      <p>{entry.subtitle}</p>
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

export default DoctorPatientsPage;
