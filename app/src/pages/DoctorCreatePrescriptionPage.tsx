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
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import {
  api,
  ApiFamilyMember,
  ApiDoctorPatient,
  ApiMedicine,
  ApiPatientLookup,
  ApiPrescription,
  ApiPrescriptionPrintData
} from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';
import { formatDateHaiti } from '../utils/time';

const emptyMedicine = () => ({
  name: '',
  strength: '',
  form: '',
  quantity: 1,
  durationDays: '7',
  dailyDosage: '1',
  notes: '',
  genericAllowed: true,
  conversionAllowed: false
});

type DraftMedicine = ReturnType<typeof emptyMedicine>;

const FORM_OPTIONS = ['Capsule', 'Comprime', 'Gelule', 'Gouttes', 'Injection', 'Pommade', 'Sachet', 'Sirop', 'Spray'];
const MAX_PATIENT_NAME_LENGTH = 255;
const MAX_MEDICINE_NAME_LENGTH = 255;
const MAX_MEDICINE_STRENGTH_LENGTH = 50;
const MAX_MEDICINE_FORM_LENGTH = 50;
const MAX_MEDICINE_NOTES_LENGTH = 3000;
const MAX_PATIENT_PHONE_LENGTH = 14;

const toPositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
};

const clipText = (value: string, max: number): string => value.slice(0, max).trim();

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatPrintDate = (value: string | null): string => {
  if (!value) {
    return 'N/A';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('fr-HT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const parsePositiveId = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
};

const buildPrintHtml = (data: ApiPrescriptionPrintData): string => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.qr_payload)}`;
  const rows = data.medicine_requests
    .map((med, index) => {
      const details = [med.form, med.strength].filter(Boolean).join(' · ');
      const scheduleBits = [
        med.duration_days ? `${med.duration_days} j` : null,
        med.daily_dosage ? `${med.daily_dosage}/jour` : null
      ].filter(Boolean);

      return `
        <div class="rx-item">
          <div class="rx-top">
            <span class="rx-index">${index + 1}.</span>
            <span class="rx-name">${escapeHtml(med.name)}</span>
          </div>
          ${details ? `<div class="sub">${escapeHtml(details)}</div>` : ''}
          <div class="sub"><strong>Qté:</strong> ${med.quantity ?? 1}</div>
          <div class="sub"><strong>Posologie:</strong> ${scheduleBits.length ? escapeHtml(scheduleBits.join(' · ')) : '-'}</div>
          ${med.notes ? `<div class="sub"><strong>Note:</strong> ${escapeHtml(med.notes)}</div>` : ''}
        </div>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ordonnance ${data.print_code}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      color: #111827;
      margin: 0 auto;
      width: 74mm;
      max-width: 74mm;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { text-align: center; border-bottom: 1px dashed #64748b; padding-bottom: 6px; margin-bottom: 6px; }
    h1 { font-size: 14px; margin: 6px 0 12px; font-weight: 700; }
    .meta { text-align: left; margin-top: 6px; }
    .meta div { margin: 1px 0; }
    .qr { text-align:center; margin-top: 8px; }
    .qr img { width: 50%; max-width: 140px; aspect-ratio: 1 / 1; border: 1px solid #cbd5e1; padding: 3px; border-radius: 6px; }
    .qr-separator { margin: 10px 0; width: 100%; border-top: 1px dashed #64748b; }
    .code { margin-top: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; }
    .section-title { font-size: 12px; font-weight: 700; margin: 8px 0 4px; }
    .rx-item { border-top: 1px dashed #cbd5e1; padding: 4px 0; }
    .rx-top { display: flex; gap: 4px; align-items: baseline; }
    .rx-index { font-weight: 700; }
    .rx-name { font-weight: 700; }
    .sub { color:#334155; font-size:10px; margin-top:1px; }
    .footer {
      margin-top: 8px;
      border-top: 1px dashed #64748b;
      padding-top: 6px;
      color:#475569;
      font-size:10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ordonnance ${escapeHtml(data.print_code)}</h1>
    <div class="meta">
      <div><strong>Patient:</strong> ${escapeHtml(data.patient_name)}</div>
      ${data.family_member_name ? `<div><strong>Membre:</strong> ${escapeHtml(data.family_member_name)}</div>` : ''}
      <div><strong>Téléphone:</strong> ${escapeHtml(data.patient_phone || 'N/A')}</div>
      <div><strong>Médecin:</strong> ${escapeHtml(data.doctor_name)}</div>
      <div><strong>Date:</strong> ${escapeHtml(formatPrintDate(data.requested_at))}</div>
    </div>
  </div>
  <div class="section-title">Médicaments</div>
  ${rows}
  <div class="qr">
    <div class="qr-separator"></div>
    <img src="${qrUrl}" alt="QR ordonnance" />
    <div class="code">${escapeHtml(data.print_code)}</div>
  </div>
  <div class="footer">
    Impression #${data.print_count} · Imprimé le ${escapeHtml(formatPrintDate(data.printed_at))}
  </div>
</body>
</html>`;
};

const DoctorCreatePrescriptionPage: React.FC = () => {
  const location = useLocation();
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<ApiDoctorPatient[]>([]);
  const [dbPatientSuggestions, setDbPatientSuggestions] = useState<ApiPatientLookup[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientNinu, setPatientNinu] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | ''>('');
  const [patientNotes, setPatientNotes] = useState('');
  const [selectedPatientUserId, setSelectedPatientUserId] = useState<number | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [familyMembers, setFamilyMembers] = useState<ApiFamilyMember[]>([]);
  const [familyMemberName, setFamilyMemberName] = useState('');
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<number | null>(null);
  const [medicines, setMedicines] = useState<DraftMedicine[]>([emptyMedicine()]);
  const [medicineSuggestions, setMedicineSuggestions] = useState<Record<number, ApiMedicine[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [patientCreateMessage, setPatientCreateMessage] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestPrescriptionId, setLatestPrescriptionId] = useState<number | null>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const medicineDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const patientDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;
  const routeVisitId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return parsePositiveId(params.get('visitId'));
  }, [location.search]);
  const doctorHasGps = Boolean(
    String(user?.latitude ?? '').trim() && String(user?.longitude ?? '').trim()
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefilledPatient = params.get('patient');
    const prefilledPatientUserIdRaw = params.get('patientUserId');
    const prefilledPatientUserId = prefilledPatientUserIdRaw ? Number(prefilledPatientUserIdRaw) : null;
    const prefilledFamilyMemberName = params.get('familyMemberName');
    const prefilledFamilyMemberIdRaw = params.get('familyMemberId');
    const prefilledFamilyMemberId = parsePositiveId(prefilledFamilyMemberIdRaw);
    if (routeVisitId) {
      setSelectedVisitId(routeVisitId);
    } else {
      setSelectedVisitId(null);
    }

    if (prefilledPatient) {
      setPatientName(prefilledPatient);
      const matching = prescriptions.find((p) => p.patient_name === prefilledPatient && p.patient_user_id);
      setSelectedPatientUserId(
        Number.isFinite(prefilledPatientUserId ?? NaN)
          ? Number(prefilledPatientUserId)
          : matching?.patient_user_id ?? null
      );
      if (prefilledFamilyMemberName) {
        setFamilyMemberName(prefilledFamilyMemberName);
      }
      if (prefilledFamilyMemberId) {
        setSelectedFamilyMemberId(prefilledFamilyMemberId);
      }
    }
  }, [location.search, prescriptions, routeVisitId]);

  const loadPrescriptionsFromApi = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await api.getDoctorPrescriptions(token);
    setPrescriptions(data);
    if (cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    }
  }, [cacheKey, token]);

  const loadDoctorPatientsFromApi = useCallback(async () => {
    if (!token) {
      return;
    }
    const rows = await api.getDoctorPatients(token);
    setDoctorPatients(rows);
  }, [token]);

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
          loadDoctorPatientsFromApi().catch(() => undefined);
          return;
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    loadPrescriptionsFromApi().catch(() => undefined);
    loadDoctorPatientsFromApi().catch(() => undefined);
  }, [cacheKey, loadDoctorPatientsFromApi, loadPrescriptionsFromApi]);

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

  const adjustQuantity = (index: number, delta: number) => {
    const current = toPositiveInt(medicines[index]?.quantity) ?? 1;
    updateMedicine(index, { quantity: Math.max(1, current + delta) });
  };

  const adjustDuration = (index: number, delta: number) => {
    const current = toPositiveInt(medicines[index]?.durationDays) ?? 1;
    updateMedicine(index, { durationDays: String(Math.max(1, current + delta)) });
  };

  const adjustDailyDosage = (index: number, delta: number) => {
    const current = toPositiveInt(medicines[index]?.dailyDosage) ?? 1;
    updateMedicine(index, { dailyDosage: String(Math.max(1, current + delta)) });
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
    const medicineDebounceMap = medicineDebounceRef.current;
    const patientDebounceTimer = patientDebounceRef.current;
    return () => {
      Object.values(medicineDebounceMap).forEach((timer) => clearTimeout(timer));
      if (patientDebounceTimer) {
        clearTimeout(patientDebounceTimer);
      }
    };
  }, []);

  useEffect(() => {
    const query = patientName.trim();
    if (!token || query.length < 2) {
      setDbPatientSuggestions([]);
      return;
    }

    if (patientDebounceRef.current) {
      clearTimeout(patientDebounceRef.current);
    }

    patientDebounceRef.current = setTimeout(() => {
      api
        .searchDoctorPatients(token, query, 8)
        .then((rows) => setDbPatientSuggestions(rows))
        .catch(() => setDbPatientSuggestions([]));
    }, 250);
  }, [patientName, token]);

  useEffect(() => {
    if (selectedPatientUserId !== null) {
      return;
    }

    const exact = prescriptions.find(
      (p) => p.patient_name.trim().toLowerCase() === patientName.trim().toLowerCase() && p.patient_user_id
    );
    if (exact?.patient_user_id) {
      setSelectedPatientUserId(exact.patient_user_id);
    }
  }, [patientName, prescriptions, selectedPatientUserId]);

  useEffect(() => {
    if (!token || !selectedPatientUserId) {
      setFamilyMembers([]);
      setFamilyMemberName('');
      setSelectedFamilyMemberId(null);
      return;
    }

    api
      .getDoctorPatientFamilyMembers(token, selectedPatientUserId)
      .then((rows) => setFamilyMembers(rows))
      .catch(() => setFamilyMembers([]));
  }, [selectedPatientUserId, token]);

  const submitPrescription = async () => {
    const normalizedPatientName = clipText(patientName, MAX_PATIENT_NAME_LENGTH);
    if (!normalizedPatientName) {
      setError('Nom du patient requis.');
      return;
    }
    if (!selectedPatientUserId) {
      setError("Selectionnez un patient existant ou creez d'abord un patient.");
      return;
    }
    if (!token) {
      setError('Veuillez vous reconnecter.');
      return;
    }

    const medicineRequests = medicines
      .map((med) => ({
        name: clipText(med.name, MAX_MEDICINE_NAME_LENGTH),
        strength: med.strength ? clipText(med.strength, MAX_MEDICINE_STRENGTH_LENGTH) : null,
        form: med.form ? clipText(med.form, MAX_MEDICINE_FORM_LENGTH) : null,
        quantity: toPositiveInt(med.quantity) ?? 1,
        duration_days: toPositiveInt(med.durationDays),
        daily_dosage: toPositiveInt(med.dailyDosage),
        notes: med.notes ? clipText(med.notes, MAX_MEDICINE_NOTES_LENGTH) : null,
        generic_allowed: Boolean(med.genericAllowed),
        conversion_allowed: Boolean(med.conversionAllowed)
      }))
      .filter((med) => med.name);

    if (medicineRequests.length === 0) {
      setError('Ajoutez au moins un medicament valide.');
      return;
    }

    const effectiveVisitId = (selectedVisitId && selectedVisitId > 0 ? selectedVisitId : routeVisitId) ?? null;

    setLoading(true);
    setError(null);
    setPrintMessage(null);
    try {
      const payload = {
        patient_name: normalizedPatientName,
        patient_phone: maskHaitiPhone(patientPhone).trim() || null,
        patient_user_id: selectedPatientUserId,
        family_member_id: selectedFamilyMemberId ?? undefined,
        visit_id: effectiveVisitId,
        medicine_requests: medicineRequests
      };
      console.log('[CREATE PRESCRIPTION] payload', payload);
      const created = await api.createPrescription(token, payload);
      console.log('[CREATE PRESCRIPTION] success');
      setLatestPrescriptionId(created.id);
      await printPrescription(created.id);
      await loadPrescriptionsFromApi();

      const searchParams = new URLSearchParams(location.search);
      if (effectiveVisitId) {
        const context = new URLSearchParams();
        const patientUserIdRaw = searchParams.get('patientUserId');
        const patientRaw = searchParams.get('patient');
        const familyMemberIdRaw = searchParams.get('familyMemberId');
        const familyMemberNameRaw = searchParams.get('familyMemberName');
        if (patientUserIdRaw) context.set('patientUserId', patientUserIdRaw);
        if (patientRaw) context.set('patient', patientRaw);
        if (familyMemberIdRaw) context.set('familyMemberId', familyMemberIdRaw);
        if (familyMemberNameRaw) context.set('familyMemberName', familyMemberNameRaw);
        const suffix = context.toString() ? `?${context.toString()}` : '';
        ionRouter.push(`/doctor/visits/${effectiveVisitId}${suffix}`, 'back', 'pop');
        return;
      }

      setPatientName('');
      setPatientPhone('');
      setPatientNinu('');
      setPatientDob('');
      setPatientAddress('');
      setPatientAge('');
      setPatientGender('');
      setPatientNotes('');
      setSelectedPatientUserId(null);
      setFamilyMembers([]);
      setFamilyMemberName('');
      setSelectedFamilyMemberId(null);
      setMedicines([emptyMedicine()]);
      setPrintMessage(`Ordonnance ${created.print_code ?? created.id} publiee et prete a imprimer.`);
    } catch (err) {
      console.error('[CREATE PRESCRIPTION] failed', err);
      setError(err instanceof Error ? err.message : "Impossible de creer l'ordonnance pour le moment. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };

  const createDoctorPatient = async () => {
    if (!token) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    if (!patientName.trim()) {
      setError('Nom du patient requis.');
      return;
    }

    setLoading(true);
    setError(null);
    setPatientCreateMessage(null);
    setAvailabilityMessage(null);
    try {
      const created = await api.createDoctorPatient(token, {
        name: patientName.trim(),
        phone: maskHaitiPhone(patientPhone).trim() || null,
        ninu: patientNinu.trim() || null,
        date_of_birth: patientDob || null,
        address: patientAddress.trim() || null,
        age: toPositiveInt(patientAge),
        gender: patientGender || null,
        notes: patientNotes.trim() || null
      });
      setDoctorPatients((prev) => {
        const next = [...prev.filter((row) => row.id !== created.id), created];
        next.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        return next;
      });
      setSelectedPatientUserId(created.id);
      setPatientCreateMessage('Patient cree et selectionne.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echec de creation du patient.');
    } finally {
      setLoading(false);
    }
  };

  const checkPatientAvailability = async () => {
    if (!token) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    if (!patientName.trim() && !patientPhone.trim() && !patientNinu.trim() && !patientDob) {
      setAvailabilityMessage('Ajoutez au moins un critere (nom, telephone, NINU ou date de naissance).');
      return;
    }

    setLoading(true);
    setError(null);
    setPatientCreateMessage(null);
    try {
      const result = await api.checkDoctorPatientAvailability(token, {
        name: patientName.trim() || undefined,
        phone: patientPhone.trim() || undefined,
        ninu: patientNinu.trim() || undefined,
        date_of_birth: patientDob || undefined,
        limit: 5
      });

      if (result.available) {
        setAvailabilityMessage('Aucun patient similaire trouve. Vous pouvez creer le nouveau patient.');
      } else {
        const sample = result.matches
          .slice(0, 3)
          .map((row) => `${row.name}${row.ninu ? ` (NINU ${row.ninu})` : ''}`)
          .join(', ');
        setAvailabilityMessage(
          `${result.count} patient(s) similaire(s) trouve(s): ${sample}. Selectionnez un patient existant si possible.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification indisponible.');
    } finally {
      setLoading(false);
    }
  };

  const printPrescription = async (prescriptionId: number) => {
    if (!token) {
      return;
    }

    try {
      const printData = await api.getDoctorPrescriptionPrintData(token, prescriptionId);
      const popup = window.open('about:blank', '_blank', 'width=420,height=860');
      if (!popup) {
        setPrintMessage('Popup bloquee. Autorisez les popups puis reessayez.');
        return;
      }

      popup.document.open();
      popup.document.write(buildPrintHtml(printData));
      popup.document.close();
      popup.focus();
      popup.onload = () => {
        window.setTimeout(() => {
          popup.print();
        }, 250);
      };
    } catch (err) {
      console.error('[PRINT PRESCRIPTION] failed', err);
      setPrintMessage(err instanceof Error ? err.message : "Impossible de charger les donnees d'impression.");
    }
  };

  const patientSuggestions = useMemo(() => {
    const query = patientName.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const fromDb = dbPatientSuggestions.map((row) => ({
      key: `db-${row.id}`,
      label: row.name,
      subtitle: [row.ninu ? `NINU: ${row.ninu}` : null, row.phone ? `Tel: ${row.phone}` : null, row.date_of_birth ? `Nais: ${formatDateHaiti(row.date_of_birth)}` : null]
        .filter(Boolean)
        .join(' · '),
      patientUserId: row.id,
      phone: row.phone ?? '',
      ninu: row.ninu ?? '',
      dateOfBirth: row.date_of_birth ?? '',
      address: '',
      age: '',
      gender: '' as '' | 'male' | 'female',
      notes: ''
    }));

    const dbIds = new Set(fromDb.map((row) => row.patientUserId));

    const fromDoctorPatients = doctorPatients
      .filter((g) => !dbIds.has(g.id))
      .filter((g) => g.name.toLowerCase().includes(query))
      .map((g) => ({
        key: `doctor-patient-${g.id}`,
        label: g.name,
        subtitle: [g.phone ? `Tel: ${g.phone}` : null, 'Patient'].filter(Boolean).join(' · '),
        patientUserId: g.id,
        phone: g.phone ?? '',
        ninu: g.ninu ?? '',
        dateOfBirth: g.date_of_birth ?? '',
        address: g.address ?? '',
        age: g.age ? String(g.age) : '',
        gender: (g.gender ?? '') as '' | 'male' | 'female',
        notes: g.notes ?? ''
      }));

    return [...fromDb, ...fromDoctorPatients].slice(0, 8);
  }, [dbPatientSuggestions, doctorPatients, patientName]);

  const familyMemberSuggestions = useMemo(() => {
    const query = familyMemberName.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return familyMembers
      .filter((member) => member.name.toLowerCase().includes(query) && member.name.toLowerCase() !== query)
      .slice(0, 5);
  }, [familyMemberName, familyMembers]);

  const hasSelectedPatient = selectedPatientUserId !== null;

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
                maxlength={MAX_PATIENT_NAME_LENGTH}
                onIonInput={(event) => {
                  const nextValue = event.detail.value ?? '';
                  setPatientName(nextValue);
                  setSelectedPatientUserId(null);
                  setPatientNinu('');
                  setPatientDob('');
                  setPatientCreateMessage(null);
                  setAvailabilityMessage(null);
                  setFamilyMembers([]);
                  setFamilyMemberName('');
                  setSelectedFamilyMemberId(null);
                }}
              />
            </IonItem>
            {patientSuggestions.length > 0 && !selectedPatientUserId ? (
              <IonList inset>
                {patientSuggestions.map((suggestion) => (
                  <IonItem
                    key={suggestion.key}
                    button
                    detail={false}
                    lines="none"
                    onClick={() => {
                      setPatientName(suggestion.label);
                      setSelectedPatientUserId(suggestion.patientUserId);
                      setPatientPhone(maskHaitiPhone(suggestion.phone));
                      setPatientNinu(suggestion.ninu);
                      setPatientDob(suggestion.dateOfBirth);
                      setPatientAddress(suggestion.address);
                      setPatientAge(suggestion.age);
                      setPatientGender(suggestion.gender);
                      setPatientNotes(suggestion.notes);
                      setFamilyMemberName('');
                      setSelectedFamilyMemberId(null);
                    }}
                  >
                    <IonLabel>
                      {suggestion.label}
                      {suggestion.subtitle ? <p>{suggestion.subtitle}</p> : null}
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            ) : null}
            {!hasSelectedPatient ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Telephone (optionnel)</IonLabel>
                  <IonInput
                    value={patientPhone}
                    placeholder="+509-xxxx-xxxx"
                    maxlength={MAX_PATIENT_PHONE_LENGTH}
                    inputmode="tel"
                    onIonInput={(event) => setPatientPhone(maskHaitiPhone(event.detail.value ?? ''))}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">NINU (optionnel)</IonLabel>
                  <IonInput
                    value={patientNinu}
                    placeholder="Ex: 1234-5678-9012"
                    onIonInput={(event) => setPatientNinu(event.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Date de naissance (optionnel)</IonLabel>
                  <IonInput
                    type="date"
                    value={patientDob}
                    onIonInput={(event) => setPatientDob(event.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Adresse (optionnel)</IonLabel>
                  <IonInput
                    value={patientAddress}
                    placeholder="Adresse"
                    onIonInput={(event) => setPatientAddress(event.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Age (optionnel)</IonLabel>
                  <IonInput
                    type="number"
                    min="0"
                    value={patientAge}
                    placeholder="Age"
                    onIonInput={(event) => setPatientAge(event.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Genre (optionnel)</IonLabel>
                  <IonSelect
                    interface="popover"
                    placeholder="Selectionner"
                    value={patientGender}
                    onIonChange={(event) => setPatientGender((event.detail.value as 'male' | 'female' | '') ?? '')}
                  >
                    <IonSelectOption value="male">M</IonSelectOption>
                    <IonSelectOption value="female">F</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Notes patient (optionnel)</IonLabel>
                  <IonTextarea
                    autoGrow
                    value={patientNotes}
                    placeholder="Infos utiles pour ce patient"
                    onIonInput={(event) => setPatientNotes(event.detail.value ?? '')}
                  />
                </IonItem>
                {!selectedPatientUserId ? (
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="medium"
                    disabled={loading}
                    onClick={() => checkPatientAvailability().catch(() => undefined)}
                  >
                    Verifier disponibilite du patient
                  </IonButton>
                ) : null}
                {availabilityMessage ? (
                  <IonText color="medium">
                    <p>{availabilityMessage}</p>
                  </IonText>
                ) : null}
                {!selectedPatientUserId ? (
                  <IonButton
                    expand="block"
                    fill="outline"
                    disabled={loading || !patientName.trim()}
                    onClick={() => createDoctorPatient().catch(() => undefined)}
                  >
                    Creer ce patient
                  </IonButton>
                ) : null}
                {patientCreateMessage ? (
                  <IonText color="success">
                    <p>{patientCreateMessage}</p>
                  </IonText>
                ) : null}
              </>
            ) : null}
            {hasSelectedPatient ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Membre de famille (optionnel)</IonLabel>
                  <IonInput
                    value={familyMemberName}
                    placeholder="Tapez un nom"
                    onIonInput={(event) => {
                      setFamilyMemberName(event.detail.value ?? '');
                      setSelectedFamilyMemberId(null);
                    }}
                  />
                </IonItem>
                {familyMemberSuggestions.length > 0 ? (
                  <IonList inset>
                    {familyMemberSuggestions.map((member) => (
                      <IonItem
                        key={member.id}
                        button
                        detail={false}
                        lines="none"
                        onClick={() => {
                          setFamilyMemberName(member.name);
                          setSelectedFamilyMemberId(member.id);
                        }}
                      >
                        <IonLabel>{member.name}</IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                ) : null}
              </>
            ) : null}

            <IonText className="ion-padding-top">
              Medicaments (une demande par medicament)
            </IonText>

            <IonList>
              {medicines.map((med, index) => (
                <IonCard key={`${index}`} className="surface-card" style={{ marginTop: '12px' }}>
                  <IonCardContent>
                    <h2 style={{ marginTop: 0, marginBottom: '10px' }}>Medicament {index + 1}</h2>
                    <IonItem>
                      <IonLabel position="stacked">Nom *</IonLabel>
                      <IonInput
                        value={med.name}
                        placeholder="ex: Amoxicilline"
                        maxlength={MAX_MEDICINE_NAME_LENGTH}
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
                      <IonLabel position="stacked">Dosage *</IonLabel>
                      <IonInput
                        value={med.strength}
                        placeholder="ex: 500mg"
                        maxlength={MAX_MEDICINE_STRENGTH_LENGTH}
                        onIonInput={(event) => updateMedicine(index, { strength: event.detail.value ?? '' })}
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Forme *</IonLabel>
                      <IonSelect
                        interface="popover"
                        placeholder="Selectionner la forme"
                        value={med.form}
                        onIonChange={(event) => updateMedicine(index, { form: (event.detail.value as string) ?? '' })}
                      >
                        {FORM_OPTIONS.map((option) => (
                          <IonSelectOption key={`${index}-${option}`} value={option}>
                            {option}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Quantite *</IonLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <IonButton fill="outline" onClick={() => adjustQuantity(index, -1)}>
                          -
                        </IonButton>
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
                        <IonButton fill="outline" onClick={() => adjustQuantity(index, 1)}>
                          +
                        </IonButton>
                      </div>
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Duree (jours)</IonLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <IonButton fill="outline" onClick={() => adjustDuration(index, -1)}>
                          -
                        </IonButton>
                        <IonInput
                          type="number"
                          min="1"
                          value={med.durationDays}
                          placeholder="7"
                          onIonInput={(event) => updateMedicine(index, { durationDays: event.detail.value ?? '' })}
                        />
                        <IonButton fill="outline" onClick={() => adjustDuration(index, 1)}>
                          +
                        </IonButton>
                      </div>
                    </IonItem>
                    <IonText color="medium" style={{ fontSize: '0.9rem', padding: '0 16px', display: 'block', marginTop: '4px' }}>
                      Combien de jours ce medicament doit etre pris ?
                    </IonText>
                    <IonItem>
                      <IonLabel position="stacked">Dose journaliere (fois par jour)</IonLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <IonButton fill="outline" onClick={() => adjustDailyDosage(index, -1)}>
                          -
                        </IonButton>
                        <IonInput
                          type="number"
                          min="1"
                          value={med.dailyDosage}
                          placeholder="1"
                          onIonInput={(event) => updateMedicine(index, { dailyDosage: event.detail.value ?? '' })}
                        />
                        <IonButton fill="outline" onClick={() => adjustDailyDosage(index, 1)}>
                          +
                        </IonButton>
                      </div>
                    </IonItem>
                    <IonText color="medium" style={{ fontSize: '0.9rem', padding: '0 16px', display: 'block', marginTop: '4px' }}>
                      Laisser vide pour ne pas programmer de rappel automatique.
                    </IonText>
                    <IonItem>
                      <IonLabel position="stacked">Notes</IonLabel>
                      <IonTextarea
                        autoGrow
                        value={med.notes}
                        maxlength={MAX_MEDICINE_NOTES_LENGTH}
                        placeholder="Notes specifiques pour ce medicament..."
                        onIonInput={(event) => updateMedicine(index, { notes: event.detail.value ?? '' })}
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
            {!doctorHasGps ? (
              <IonText color="warning">
                <p>
                  GPS requis: renseignez latitude et longitude dans le profil medecin avant de publier une ordonnance.
                </p>
              </IonText>
            ) : null}
            <IonButton expand="block" onClick={submitPrescription} disabled={loading || !doctorHasGps}>
              Publier la demande d'ordonnance
            </IonButton>
            {latestPrescriptionId ? (
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => printPrescription(latestPrescriptionId)}
              >
                Imprimer l ordonnance (QR)
              </IonButton>
            ) : null}
            {printMessage ? (
              <IonText color="success">
                <p>{printMessage}</p>
              </IonText>
            ) : null}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default DoctorCreatePrescriptionPage;
