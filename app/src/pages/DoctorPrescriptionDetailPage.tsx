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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiMedicalHistoryEntry, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateHaiti, formatDateTime } from '../utils/time';

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

const DoctorPrescriptionDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [prescription, setPrescription] = useState<ApiPrescription | null>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [linkNinu, setLinkNinu] = useState('');
  const [linkDob, setLinkDob] = useState('');
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [loadingHistoryEntries, setLoadingHistoryEntries] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<ApiMedicalHistoryEntry[]>([]);
  const [historyPickerError, setHistoryPickerError] = useState<string | null>(null);
  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;
  const familyMemberIdFromQuery = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('familyMemberId');
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [location.search]);
  const historyScope = useMemo(() => new URLSearchParams(location.search).get('scope'), [location.search]);
  const familyMemberNameFromQuery = useMemo(
    () => new URLSearchParams(location.search).get('familyMemberName'),
    [location.search]
  );

  useEffect(() => {
    const load = async () => {
      if (!cacheKey) {
        return;
      }

      const targetId = Number(id);
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
          if (Array.isArray(cachedData)) {
            const found = cachedData.find((p) => p.id === targetId) ?? null;
            if (found) {
              setPrescription(found);
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
      localStorage.setItem(cacheKey, JSON.stringify(data));
      setPrescription(data.find((p) => p.id === targetId) ?? null);
    };

    load().catch(() => undefined);
  }, [cacheKey, id, token]);

  const printPrescription = async () => {
    if (!token || !prescription) {
      return;
    }
    try {
      const data = await api.getDoctorPrescriptionPrintData(token, prescription.id);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(data.qr_payload)}`;
      const rows = data.medicine_requests
        .map((med, index) => {
          const details = [med.form, med.strength].filter(Boolean).join(' · ');
          return `
            <tr>
              <td>${index + 1}</td>
              <td>
                <strong>${escapeHtml(med.name)}</strong>
                ${details ? `<div style="color:#475569;font-size:12px">${escapeHtml(details)}</div>` : ''}
              </td>
              <td>${med.quantity ?? 1}</td>
            </tr>
          `;
        })
        .join('');
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
      <title>Ordonnance ${data.print_code}</title>
      <style>
      body{font-family:Arial,sans-serif;color:#0f172a;margin:24px}
      .header{display:flex;justify-content:space-between;gap:16px}
      .meta{font-size:14px;line-height:1.5}
      .qr img{width:200px;height:200px;border:1px solid #cbd5e1;padding:6px;border-radius:10px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
      th{background:#f8fafc}
      </style></head><body>
      <div class="header">
      <div class="meta">
      <h2>Ordonnance ${escapeHtml(data.print_code)}</h2>
      <div><strong>Patient:</strong> ${escapeHtml(data.patient_name)}</div>
      <div><strong>Docteur:</strong> ${escapeHtml(data.doctor_name)}</div>
      <div><strong>Date:</strong> ${escapeHtml(formatPrintDate(data.requested_at))}</div>
      </div>
      <div class="qr"><img src="${qrUrl}" alt="QR" /><div><strong>${escapeHtml(data.print_code)}</strong></div></div>
      </div>
      <table><thead><tr><th>#</th><th>Medicament</th><th>Quantite</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:14px;color:#475569;font-size:12px">Impression #${data.print_count} · ${escapeHtml(formatPrintDate(data.printed_at))}</div>
      </body></html>`;

      const popup = window.open('about:blank', '_blank', 'width=980,height=900');
      if (!popup) {
        setPrintMessage('Popup bloquee. Autorisez les popups puis reessayez.');
        return;
      }
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.onload = () => {
        window.setTimeout(() => popup.print(), 250);
      };
      setPrintMessage('Version imprimable chargee.');
    } catch (err) {
      console.error('[REPRINT] failed', err);
      setPrintMessage(err instanceof Error ? err.message : 'Impossible de reimprimer.');
    }
  };

  const linkPatientWithNinu = async () => {
    if (!token || !prescription || !linkNinu.trim()) {
      return;
    }
    setIsLinking(true);
    setLinkMessage(null);
    try {
      const updated = await api.linkDoctorPrescriptionPatientByNinu(token, prescription.id, linkNinu.trim());
      setPrescription(updated);
      setLinkMessage(`Patient lie avec succes via NINU ${linkNinu.trim()}.`);
      if (cacheKey) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
            if (Array.isArray(cachedData)) {
              const next = cachedData.map((row) => (row.id === updated.id ? updated : row));
              localStorage.setItem(cacheKey, JSON.stringify(next));
            }
          } catch {
            localStorage.removeItem(cacheKey);
          }
        }
      }
    } catch (err) {
      setLinkMessage(err instanceof Error ? err.message : 'Echec du lien NINU.');
    } finally {
      setIsLinking(false);
    }
  };

  const createAndLinkPatient = async () => {
    if (!token || !prescription) {
      return;
    }
    setIsLinking(true);
    setLinkMessage(null);
    try {
      const updated = await api.createAndLinkDoctorPrescriptionPatient(token, prescription.id, {
        ninu: linkNinu.trim() || undefined,
        date_of_birth: linkDob || undefined
      });
      setPrescription(updated);
      setLinkMessage('Patient cree/lie avec succes. Historique medical active.');
      if (cacheKey) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
            if (Array.isArray(cachedData)) {
              const next = cachedData.map((row) => (row.id === updated.id ? updated : row));
              localStorage.setItem(cacheKey, JSON.stringify(next));
            }
          } catch {
            localStorage.removeItem(cacheKey);
          }
        }
      }
    } catch (err) {
      setLinkMessage(err instanceof Error ? err.message : 'Echec de creation/liaison patient.');
    } finally {
      setIsLinking(false);
    }
  };

  const openHistoryPicker = async () => {
    if (!token || !prescription?.patient_user_id) {
      return;
    }
    const targetFamilyMemberId =
      historyScope === 'principal'
        ? null
        : familyMemberIdFromQuery ?? prescription.family_member_id ?? null;
    setShowHistoryPicker(true);
    setLoadingHistoryEntries(true);
    setHistoryPickerError(null);
    try {
      const rows = await api.getDoctorPatientMedicalHistory(token, prescription.patient_user_id, {
        family_member_id: targetFamilyMemberId ?? undefined
      });
      setHistoryEntries(
        targetFamilyMemberId
          ? rows.filter((entry) => entry.family_member_id === targetFamilyMemberId)
          : rows.filter((entry) => !entry.family_member_id)
      );
    } catch (err) {
      setHistoryPickerError(err instanceof Error ? err.message : "Impossible de charger l'historique.");
      setHistoryEntries([]);
    } finally {
      setLoadingHistoryEntries(false);
    }
  };

  const linkPrescriptionToHistory = async (entry: ApiMedicalHistoryEntry) => {
    if (!token || !prescription?.patient_user_id) {
      return;
    }
    setIsLinking(true);
    setHistoryPickerError(null);
    try {
      await api.linkDoctorPatientMedicalHistoryPrescription(
        token,
        prescription.patient_user_id,
        entry.id,
        prescription.id
      );
      setShowHistoryPicker(false);
      setLinkMessage(`Ordonnance liee a l'historique ${entry.entry_code ?? `MH-${entry.id}`}.`);
      const params = new URLSearchParams(location.search);
      const familyMemberId = params.get('familyMemberId');
      const familyMemberName = params.get('familyMemberName');
      const patientName = prescription.patient_name ?? '';
      const targetPath = `/doctor/patients/${encodeURIComponent(patientName)}`;
      const targetQuery = new URLSearchParams();
      if (familyMemberId && familyMemberName) {
        targetQuery.set('familyMemberId', familyMemberId);
        targetQuery.set('familyMemberName', familyMemberName);
      }
      const query = targetQuery.toString();
      window.location.assign(query ? `${targetPath}?${query}` : targetPath);
    } catch (err) {
      setHistoryPickerError(err instanceof Error ? err.message : 'Echec de liaison.');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/prescriptions" />
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
                <IonCardTitle>
                  {prescription.familyMember?.name ||
                    prescription.family_member?.name ||
                    familyMemberNameFromQuery ||
                    prescription.patient_name}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="status-row">
                  <span>Statut:</span>
                  <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                    {getPrescriptionStatusLabel(prescription.status)}
                  </IonBadge>
                </div>
                <p>Code ordonnance: {getPrescriptionCode(prescription)}</p>
                <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
                <IonButton fill="outline" onClick={printPrescription}>
                  Reimprimer (QR)
                </IonButton>
                <IonButton
                  fill="outline"
                  disabled={!prescription.patient_user_id}
                  onClick={() => openHistoryPicker().catch(() => undefined)}
                >
                  Ajouter a l historique
                </IonButton>
                {!prescription.patient_user_id ? (
                  <>
                    <p style={{ marginTop: '8px' }}>
                      Historique medical indisponible tant que cette ordonnance n'est pas liee a un patient.
                    </p>
                    <IonItem lines="none">
                      <IonLabel position="stacked">NINU (optionnel)</IonLabel>
                      <IonInput
                        value={linkNinu}
                        placeholder="Entrer le NINU du patient"
                        onIonInput={(event) => setLinkNinu(event.detail.value ?? '')}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Date de naissance (optionnel)</IonLabel>
                      <IonInput
                        type="date"
                        value={linkDob}
                        onIonInput={(event) => setLinkDob(event.detail.value ?? '')}
                      />
                    </IonItem>
                    <IonButton
                      fill="outline"
                      disabled={isLinking || !linkNinu.trim()}
                      onClick={() => linkPatientWithNinu().catch(() => undefined)}
                    >
                      {isLinking ? 'Liaison...' : 'Lier patient existant (NINU)'}
                    </IonButton>
                    <IonButton
                      fill="outline"
                      color="success"
                      disabled={isLinking}
                      onClick={() => createAndLinkPatient().catch(() => undefined)}
                    >
                      {isLinking ? 'Creation...' : 'Creer/Lier et activer historique'}
                    </IonButton>
                  </>
                ) : null}
                {linkMessage ? <p style={{ marginTop: '8px' }}>{linkMessage}</p> : null}
                {printMessage ? <p style={{ marginTop: '8px' }}>{printMessage}</p> : null}
              </IonCardContent>
            </IonCard>
            <IonModal isOpen={showHistoryPicker} onDidDismiss={() => setShowHistoryPicker(false)}>
              <IonContent className="ion-padding app-content">
                <h2 style={{ marginTop: 0 }}>Selectionner un historique</h2>
                <IonText color="medium">
                  <p>Choisissez le code d'historique pour lier cette ordonnance.</p>
                </IonText>

                {loadingHistoryEntries ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: '160px' }}>
                    <IonSpinner name="crescent" />
                  </div>
                ) : historyEntries.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucune entree d'historique disponible pour ce patient.</p>
                  </IonText>
                ) : (
                  <IonList>
                    {historyEntries.map((entry) => (
                      <IonItem
                        key={entry.id}
                        button
                        detail={false}
                        onClick={() => linkPrescriptionToHistory(entry).catch(() => undefined)}
                      >
                        <IonLabel>
                          <h3 id={`history-code-${entry.id}`}>{entry.entry_code ?? `MH-${entry.id}`}</h3>
                          <p id={`history-title-${entry.id}`}>{entry.title}</p>
                          {entry.details ? <p id={`history-details-${entry.id}`}>{entry.details}</p> : null}
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
                {historyPickerError ? (
                  <IonText color="danger">
                    <p>{historyPickerError}</p>
                  </IonText>
                ) : null}
                <IonButton expand="block" fill="outline" color="medium" onClick={() => setShowHistoryPicker(false)}>
                  Fermer
                </IonButton>
              </IonContent>
            </IonModal>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>Medicaments</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {prescription.medicine_requests.map((med) => (
                    <IonItem key={med.id} lines="full">
                      <IonLabel>
                        <h3 style={{ fontWeight: 800 }}>{med.name}</h3>
                        <p>
                          {med.strength || 'Sans dosage'} · {med.form || 'Sans forme'}
                        </p>
                        <p>Quantite demandee: {med.quantity ?? 1}</p>
                        <p>Duree: {med.duration_days ?? '-'} jour(s)</p>
                        <p>Dose journaliere: {med.daily_dosage ?? '-'} fois/jour</p>
                        <p>Notes: {med.notes ?? '-'}</p>
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
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorPrescriptionDetailPage;
