import {
  IonButton,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTextarea,
  IonToast,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { addOutline, closeOutline, personOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorPatient, ApiFamilyMember, ApiPatientLookup, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';

const DoctorPatientsPage: React.FC = () => {
  const LOAD_TTL_MS = 30_000;
  const compactItemStyle = {
    '--background': 'transparent',
    '--border-color': '#d7e4ee',
    '--padding-start': '8px',
    '--padding-end': '8px',
    '--inner-padding-end': '0',
    height: '60px',
  } as const;
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<ApiDoctorPatient[]>([]);
  const [familyMembersByPatient, setFamilyMembersByPatient] = useState<Record<string, ApiFamilyMember[]>>({});
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSearchResults, setDbSearchResults] = useState<ApiPatientLookup[]>([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    ninu: '',
    date_of_birth: '',
    address: '',
    age: '',
    gender: '' as '' | 'male' | 'female',
    notes: ''
  });
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;
  const lastPrescriptionsLoadAtRef = useRef(0);
  const lastDoctorPatientsLoadAtRef = useRef(0);

  const loadPrescriptions = useCallback(async (force = false) => {
    if (!force && Date.now() - lastPrescriptionsLoadAtRef.current < LOAD_TTL_MS) {
      return;
    }
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
    lastPrescriptionsLoadAtRef.current = Date.now();
  }, [LOAD_TTL_MS, cacheKey, token]);

  const loadDoctorPatients = useCallback(async (force = false) => {
    if (!force && Date.now() - lastDoctorPatientsLoadAtRef.current < LOAD_TTL_MS) {
      return;
    }
    if (!token) return;
    const rows = await api.getDoctorPatients(token);
    setDoctorPatients(rows);
    lastDoctorPatientsLoadAtRef.current = Date.now();
  }, [LOAD_TTL_MS, token]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingData(true);
    Promise.all([loadPrescriptions(true), loadDoctorPatients(true)])
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadDoctorPatients, loadPrescriptions]);

  useIonViewWillEnter(() => {
    loadPrescriptions(false).catch(() => undefined);
    loadDoctorPatients(false).catch(() => undefined);
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
    const normalize = (value: string) => value.trim().toLocaleLowerCase();
    const patientPhotoByName = new Map<string, string>();
    const patientIdByName = new Map<string, number>();
    const patientUserIds = new Set<number>();
    const patientNames = new Set<string>();

    prescriptions.forEach((p) => {
      const candidate = p.patient?.profile_photo_url ?? null;
      if (candidate && p.patient_name?.trim()) {
        patientPhotoByName.set(normalize(p.patient_name), candidate);
      }
      if (p.patient_user_id) {
        patientUserIds.add(p.patient_user_id);
        if (p.patient_name?.trim()) {
          patientIdByName.set(normalize(p.patient_name), p.patient_user_id);
        }
      }
      if (p.patient_name?.trim()) {
        patientNames.add(normalize(p.patient_name));
      }
    });

    const prescriptionPatients = Array.from(new Set(prescriptions.map((p) => p.patient_name.trim()).filter(Boolean))).map((name) => ({
      key: `patient-${name}`,
      label: name,
      patientName: name,
      patientUserId: patientIdByName.get(normalize(name)) ?? null,
      familyMemberId: null as number | null,
      subtitle: 'Patient',
      photoUrl: patientPhotoByName.get(normalize(name)) ?? null
    }));

    const directPatients = doctorPatients.map((row) => ({
      key: `doctor-patient-${row.id}`,
      label: row.name,
      patientName: row.name,
      patientUserId: row.id,
      familyMemberId: null as number | null,
      subtitle: 'Patient',
      photoUrl: patientPhotoByName.get(normalize(row.name)) ?? null
    }));

    const familyEntries = Object.entries(familyMembersByPatient).flatMap(([patientName, members]) =>
      members
        .filter((member) => {
          const hasLinkedPatient = Boolean(member.linked_user_id && patientUserIds.has(member.linked_user_id));
          const sameNameAsPatient = patientNames.has(normalize(member.name));
          return !hasLinkedPatient && !sameNameAsPatient;
        })
        .map((member) => ({
          key: `family-${member.id}`,
          label: member.name,
          patientName,
          patientUserId: patientIdByName.get(normalize(patientName)) ?? null,
          familyMemberId: member.id,
          subtitle: `Membre de ${patientName}`,
          photoUrl: member.photo_url ?? null
        }))
    );

    const merged = [...prescriptionPatients, ...directPatients, ...familyEntries];
    const uniq = new Map<string, (typeof merged)[number]>();
    merged.forEach((entry) => {
      const dedupeKey = entry.familyMemberId
        ? `f-${entry.familyMemberId}`
        : entry.patientUserId
          ? `p-${entry.patientUserId}`
          : `n-${normalize(entry.label)}`;
      if (!uniq.has(dedupeKey)) {
        uniq.set(dedupeKey, entry);
      }
    });

    return Array.from(uniq.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );
  }, [doctorPatients, familyMembersByPatient, prescriptions]);

  const createPatient = async () => {
    if (!token || !newPatient.name.trim()) return;
    setSavingPatient(true);
    try {
      const created = await api.createDoctorPatient(token, {
        name: newPatient.name.trim(),
        phone: newPatient.phone.trim() || null,
        ninu: newPatient.ninu.trim() || null,
        date_of_birth: newPatient.date_of_birth.trim() || null,
        address: newPatient.address.trim() || null,
        age: newPatient.age.trim() ? Number(newPatient.age) : null,
        gender: newPatient.gender || null,
        notes: newPatient.notes.trim() || null,
      });
      setShowAddModal(false);
      setNewPatient({
        name: '',
        phone: '',
        ninu: '',
        date_of_birth: '',
        address: '',
        age: '',
        gender: '',
        notes: ''
      });
      setToastMessage('Patient ajoute.');
      await loadDoctorPatients();
      ionRouter.push(`/doctor/patients/${encodeURIComponent(created.name)}?patientUserId=${created.id}`, 'forward', 'push');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Echec de creation du patient.");
    } finally {
      setSavingPatient(false);
    }
  };

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
                        style={compactItemStyle}
                        onClick={() =>
                          ionRouter.push(
                            `/doctor/patients/${encodeURIComponent(row.name)}?patientUserId=${row.id}`,
                            'forward',
                            'push'
                          )
                        }
                      >
                        {row.profile_photo_url ? (
                          <img
                            slot="start"
                            src={row.profile_photo_url}
                            alt={row.name}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              borderRadius: '50%',
                              border: '1px solid #dbe7ef',
                              marginBottom: '5px'
                            }}
                          />
                        ) : (
                          <div
                            slot="start"
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '50%',
                              display: 'grid',
                              placeItems: 'center',
                              background: '#dbeafe',
                              color: '#1e40af',
                              marginBottom: '5px'
                            }}
                          >
                            <IonIcon icon={personOutline} />
                          </div>
                        )}
                        <IonLabel>
                          <h3>{row.name}</h3>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </>
            ) : null}
            {isLoadingData && patientEntries.length === 0 ? (
              <IonList>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <IonItem key={`patient-skeleton-${idx}`} lines="full">
                    <div
                      slot="start"
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: '#e2e8f0'
                      }}
                    />
                    <IonLabel>
                      <IonSkeletonText animated style={{ width: '55%', height: '14px' }} />
                      <IonSkeletonText animated style={{ width: '35%', height: '12px' }} />
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            ) : patientEntries.length === 0 ? (
              <IonText color="medium">
                <div className="empty-state-card">
                  <p style={{ margin: 0 }}>Aucun patient pour le moment.</p>
                </div>
              </IonText>
            ) : (
              <IonList>
                {patientEntries.map((entry) => (
                  <IonItem
                    key={entry.key}
                    lines="full"
                    button
                    detail
                    style={compactItemStyle}
                    onClick={() =>
                      ionRouter.push(
                        `/doctor/patients/${encodeURIComponent(entry.patientName)}${
                          entry.familyMemberId
                            ? `?familyMemberId=${entry.familyMemberId}&familyMemberName=${encodeURIComponent(entry.label)}${
                                entry.patientUserId ? `&patientUserId=${entry.patientUserId}` : ''
                              }`
                            : entry.patientUserId
                              ? `?patientUserId=${entry.patientUserId}`
                              : ''
                        }`,
                        'forward',
                        'push'
                      )
                    }
                  >
                    {entry.photoUrl ? (
                      <img
                        slot="start"
                        src={entry.photoUrl}
                        alt={entry.label}
                        style={{
                          width: '50px',
                          height: '50px',
                          objectFit: 'cover',
                          borderRadius: '50%',
                          border: '1px solid #dbe7ef',
                          marginBottom: '5px'
                        }}
                      />
                    ) : (
                      <div
                        slot="start"
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: '#dbeafe',
                          color: '#1e40af',
                          marginBottom: '5px'
                        }}
                      >
                        <IonIcon icon={personOutline} />
                      </div>
                    )}
                    <IonLabel>
                      <h3>{entry.label}</h3>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton color="primary" onClick={() => setShowAddModal(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)}>
          <IonContent className="ion-padding app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Ajouter un patient</h2>
              <IonButton fill="clear" color="medium" onClick={() => setShowAddModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>
            <IonItem lines="none">
              <IonLabel position="stacked">Nom *</IonLabel>
              <IonInput
                value={newPatient.name}
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, name: e.detail.value ?? '' }))}
                placeholder="Nom du patient"
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Telephone</IonLabel>
              <IonInput
                value={newPatient.phone}
                maxlength={14}
                inputmode="tel"
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, phone: maskHaitiPhone(e.detail.value ?? '') }))}
                placeholder="+509-xxxx-xxxx"
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">NINU</IonLabel>
              <IonInput
                value={newPatient.ninu}
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, ninu: e.detail.value ?? '' }))}
                placeholder="NINU"
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Date de naissance</IonLabel>
              <IonInput
                type="date"
                value={newPatient.date_of_birth}
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, date_of_birth: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Adresse (optionnel)</IonLabel>
              <IonInput
                value={newPatient.address}
                placeholder="Adresse"
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, address: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Age (optionnel)</IonLabel>
              <IonInput
                type="number"
                min="0"
                value={newPatient.age}
                placeholder="Age"
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, age: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Genre (optionnel)</IonLabel>
              <IonSelect
                interface="popover"
                placeholder="Selectionner"
                value={newPatient.gender}
                onIonChange={(e) =>
                  setNewPatient((prev) => ({ ...prev, gender: (e.detail.value as '' | 'male' | 'female') ?? '' }))
                }
              >
                <IonSelectOption value="male">M</IonSelectOption>
                <IonSelectOption value="female">F</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Notes patient (optionnel)</IonLabel>
              <IonTextarea
                autoGrow
                value={newPatient.notes}
                placeholder="Infos utiles pour ce patient"
                onIonInput={(e) => setNewPatient((prev) => ({ ...prev, notes: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonButton expand="block" disabled={savingPatient || !newPatient.name.trim()} onClick={() => createPatient().catch(() => undefined)}>
              {savingPatient ? 'Creation...' : 'Ajouter'}
            </IonButton>
          </IonContent>
        </IonModal>
        <IonToast isOpen={!!toastMessage} message={toastMessage || ''} duration={1800} onDidDismiss={() => setToastMessage(null)} />
      </IonContent>
    </IonPage>
  );
};

export default DoctorPatientsPage;
