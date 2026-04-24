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

const FORM_OPTIONS = ['Comprime', 'Capsule', 'Sirop', 'Injection', 'Pommade', 'Spray', 'Sachet', 'Gouttes'];
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

const buildPrintHtml = (data: ApiPrescriptionPrintData): string => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(data.qr_payload)}`;
  const rows = data.medicine_requests
    .map((med, index) => {
      const details = [med.form, med.strength].filter(Boolean).join(' · ');
      const scheduleBits = [
        med.duration_days ? `${med.duration_days} j` : null,
        med.daily_dosage ? `${med.daily_dosage}/jour` : null
      ].filter(Boolean);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(med.name)}</strong>
            ${details ? `<div class="sub">${escapeHtml(details)}</div>` : ''}
            ${med.notes ? `<div class="sub">Note: ${escapeHtml(med.notes)}</div>` : ''}
          </td>
          <td>${med.quantity ?? 1}</td>
          <td>${scheduleBits.length ? escapeHtml(scheduleBits.join(' · ')) : '-'}</td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ordonnance ${data.print_code}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
    .header { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; }
    .meta { font-size: 14px; line-height: 1.5; }
    .qr { text-align:center; }
    .qr img { width: 220px; height: 220px; border: 1px solid #cbd5e1; padding: 6px; border-radius: 10px; }
    .code { margin-top: 8px; font-size: 16px; font-weight: 700; letter-spacing: 1px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 24px 0 10px; }
    .badge { display:inline-block; background:#ecfeff; color:#0f766e; border:1px solid #99f6e4; border-radius:999px; padding: 4px 10px; font-size:12px; font-weight:600; }
    table { width:100%; border-collapse: collapse; margin-top:10px; }
    th, td { border:1px solid #e2e8f0; padding:8px; text-align:left; vertical-align:top; font-size:14px; }
    th { background:#f8fafc; }
    .sub { color:#475569; font-size:12px; margin-top:2px; }
    .footer { margin-top: 22px; color:#475569; font-size:12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Ordonnance ${escapeHtml(data.print_code)}</h1>
      <div class="meta">
        <div><strong>Patient:</strong> ${escapeHtml(data.patient_name)}</div>
        ${data.family_member_name ? `<div><strong>Membre de famille:</strong> ${escapeHtml(data.family_member_name)}</div>` : ''}
        <div><strong>Telephone:</strong> ${escapeHtml(data.patient_phone || 'N/A')}</div>
        <div><strong>Docteur:</strong> ${escapeHtml(data.doctor_name)}</div>
        <div><strong>Date:</strong> ${escapeHtml(formatPrintDate(data.requested_at))}</div>
      </div>
      <h2>Medicaments</h2>
    </div>
    <div class="qr">
      <img src="${qrUrl}" alt="QR ordonnance" />
      <div class="code">${escapeHtml(data.print_code)}</div>
      <div class="badge">Code de secours</div>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Medicament</th><th>Quantite</th><th>Posologie</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">
    Impression #${data.print_count} · Imprime le ${escapeHtml(formatPrintDate(data.printed_at))}
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
  const doctorHasGps = Boolean(
    String(user?.latitude ?? '').trim() && String(user?.longitude ?? '').trim()
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefilledPatient = params.get('patient');
    const prefilledPatientUserIdRaw = params.get('patientUserId');
    const prefilledPatientUserId = prefilledPatientUserIdRaw ? Number(prefilledPatientUserIdRaw) : null;
    const prefilledVisitIdRaw = params.get('visitId');
    const prefilledVisitId = prefilledVisitIdRaw ? Number(prefilledVisitIdRaw) : null;
    const prefilledFamilyMemberName = params.get('familyMemberName');
    const prefilledFamilyMemberIdRaw = params.get('familyMemberId');
    const prefilledFamilyMemberId = prefilledFamilyMemberIdRaw ? Number(prefilledFamilyMemberIdRaw) : null;
    if (prefilledVisitId && Number.isFinite(prefilledVisitId)) {
      setSelectedVisitId(prefilledVisitId);
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
      if (prefilledFamilyMemberId && Number.isFinite(prefilledFamilyMemberId)) {
        setSelectedFamilyMemberId(prefilledFamilyMemberId);
      }
    }
  }, [location.search, prescriptions]);

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
    const filtered = medicines.filter((med) => med.name.trim());
    if (!patientName.trim() || filtered.length === 0) {
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

    setLoading(true);
    setError(null);
    try {
      const resolvedPatientUserId = selectedPatientUserId ?? undefined;
      const params = new URLSearchParams(location.search);
      const queryVisitIdRaw = params.get('visitId');
      const queryVisitId =
        queryVisitIdRaw && Number.isFinite(Number(queryVisitIdRaw))
          ? Number(queryVisitIdRaw)
          : null;
      const safeVisitId =
        ((selectedVisitId && Number.isFinite(selectedVisitId) && selectedVisitId > 0
          ? selectedVisitId
          : null) ??
          (queryVisitId && queryVisitId > 0 ? queryVisitId : null)) &&
        Number.isFinite(
          ((selectedVisitId && Number.isFinite(selectedVisitId) && selectedVisitId > 0
            ? selectedVisitId
            : null) ??
            (queryVisitId && queryVisitId > 0 ? queryVisitId : null)) as number
        )
          ? (((selectedVisitId && Number.isFinite(selectedVisitId) && selectedVisitId > 0
              ? selectedVisitId
              : null) ??
              (queryVisitId && queryVisitId > 0 ? queryVisitId : null)) as number)
          : undefined;
      const payload = {
        patient_name: clipText(patientName, MAX_PATIENT_NAME_LENGTH),
        patient_phone: maskHaitiPhone(patientPhone).trim() || null,
        patient_user_id: resolvedPatientUserId,
        family_member_id: selectedFamilyMemberId ?? undefined,
        visit_id: safeVisitId,
        medicine_requests: filtered.map((med) => ({
          name: clipText(med.name, MAX_MEDICINE_NAME_LENGTH),
          strength: med.strength ? clipText(med.strength, MAX_MEDICINE_STRENGTH_LENGTH) : null,
          form: med.form ? clipText(med.form, MAX_MEDICINE_FORM_LENGTH) : null,
          quantity: toPositiveInt(med.quantity) ?? 1,
          duration_days: toPositiveInt(med.durationDays),
          daily_dosage: toPositiveInt(med.dailyDosage),
          notes: med.notes ? clipText(med.notes, MAX_MEDICINE_NOTES_LENGTH) : null,
          generic_allowed: med.genericAllowed,
          conversion_allowed: med.conversionAllowed
        }))
      };
      console.log('[CREATE PRESCRIPTION] payload', payload);
      const created = await api.createPrescription(token, {
        patient_name: payload.patient_name,
        patient_phone: payload.patient_phone,
        patient_user_id: payload.patient_user_id,
        family_member_id: payload.family_member_id,
        visit_id: payload.visit_id,
        medicine_requests: payload.medicine_requests
      });
      console.log('[CREATE PRESCRIPTION] success');
      setLatestPrescriptionId(created.id);
      await printPrescription(created.id);
      await loadPrescriptionsFromApi();

      const searchParams = new URLSearchParams(location.search);
      const visitIdRaw = searchParams.get('visitId');
      const visitId = visitIdRaw ? Number(visitIdRaw) : null;
      if (visitId && Number.isFinite(visitId)) {
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
        ionRouter.push(`/doctor/visits/${visitId}${suffix}`, 'back', 'pop');
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
      setError(err instanceof Error ? err.message : "Echec de creation de l'ordonnance");
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
      const popup = window.open('about:blank', '_blank', 'width=980,height=900');
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
