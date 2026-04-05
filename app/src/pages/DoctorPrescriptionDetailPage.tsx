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
  IonList,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  businessOutline,
  calendarOutline,
  callOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline,
  documentTextOutline,
  flaskOutline,
  personOutline,
  printOutline
} from 'ionicons/icons';
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

const availableResponseStatuses = new Set(['very_low', 'low', 'available', 'high', 'equivalent']);

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
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [historyVisibilityFilter, setHistoryVisibilityFilter] = useState<'all' | 'shared' | 'doctor_only'>('all');
  const [isPrescriptionContextCollapsed, setIsPrescriptionContextCollapsed] = useState(false);
  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;
  const familyMemberNameFromQuery = useMemo(
    () => new URLSearchParams(location.search).get('familyMemberName'),
    [location.search]
  );
  const patientDisplayName =
    prescription?.familyMember?.name ||
    prescription?.family_member?.name ||
    familyMemberNameFromQuery ||
    prescription?.patient_name ||
    'Patient';
  const medicineCount = prescription?.medicine_requests.length ?? 0;
  const totalQuantity = useMemo(
    () => (prescription?.medicine_requests ?? []).reduce((sum, med) => sum + (med.quantity ?? 1), 0),
    [prescription]
  );
  const pharmacyCoverage = useMemo(() => {
    if (!prescription) {
      return [];
    }
    const coverageByPharmacy = new Map<number, Set<number>>();
    prescription.responses.forEach((response) => {
      if (!availableResponseStatuses.has(response.status)) {
        return;
      }
      if (!coverageByPharmacy.has(response.pharmacy_id)) {
        coverageByPharmacy.set(response.pharmacy_id, new Set<number>());
      }
      coverageByPharmacy.get(response.pharmacy_id)?.add(response.medicine_request_id);
    });

    return Array.from(coverageByPharmacy.entries())
      .map(([pharmacyId, coveredSet]) => ({
        pharmacyId,
        coveredCount: coveredSet.size
      }))
      .sort((a, b) => b.coveredCount - a.coveredCount);
  }, [prescription]);
  const filteredHistoryEntries = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return historyEntries.filter((entry) => {
      if (historyStatusFilter !== 'all' && entry.status !== historyStatusFilter) return false;
      if (historyVisibilityFilter !== 'all' && entry.visibility !== historyVisibilityFilter) return false;
      if (!query) return true;
      const hay = `${entry.entry_code ?? ''} ${entry.title ?? ''} ${entry.type ?? ''} ${entry.details ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [historyEntries, historyQuery, historyStatusFilter, historyVisibilityFilter]);

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
    setShowHistoryPicker(true);
    setLoadingHistoryEntries(true);
    setHistoryPickerError(null);
    setHistoryQuery('');
    setHistoryStatusFilter('all');
    setHistoryVisibilityFilter('all');
    setIsPrescriptionContextCollapsed(false);
    try {
      const rows = await api.getDoctorPatientMedicalHistory(token, prescription.patient_user_id);
      setHistoryEntries(rows);
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
                <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={personOutline} />
                    {patientDisplayName}
                  </span>
                  <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                    {getPrescriptionStatusLabel(prescription.status)}
                  </IonBadge>
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <IonBadge color="light">Code: {getPrescriptionCode(prescription)}</IonBadge>
                  <IonBadge color="light">{medicineCount} medicament(s)</IonBadge>
                  <IonBadge color="light">Quantite totale: {totalQuantity}</IonBadge>
                  {prescription.family_member_id ? <IonBadge color="medium">Membre de famille</IonBadge> : null}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>Patient</p>
                    <p style={{ margin: '4px 0 0 0' }}>{patientDisplayName}</p>
                    <p style={{ margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={callOutline} />
                      {prescription.patient_phone || prescription.patient?.phone || 'N/D'}
                    </p>
                  </div>
                </div>

                <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={calendarOutline} />
                  Demandee le {formatDateTime(prescription.requested_at)}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <IonButton fill="outline" onClick={printPrescription}>
                    <IonIcon icon={printOutline} slot="start" />
                    Reimprimer (QR)
                  </IonButton>
                  <IonButton
                    fill="outline"
                    disabled={!prescription.patient_user_id}
                    onClick={() => openHistoryPicker().catch(() => undefined)}
                  >
                    Ajouter a l historique
                  </IonButton>
                </div>
                {!prescription.patient_user_id ? (
                  <div style={{ marginTop: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '10px' }}>
                    <p style={{ marginTop: 0 }}>
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
                  </div>
                ) : null}
                {linkMessage ? <p style={{ marginTop: '8px' }}>{linkMessage}</p> : null}
                {printMessage ? <p style={{ marginTop: '8px' }}>{printMessage}</p> : null}
              </IonCardContent>
            </IonCard>
            <IonModal isOpen={showHistoryPicker} onDidDismiss={() => setShowHistoryPicker(false)}>
              <IonContent className="ion-padding app-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h2 style={{ marginTop: 0 }}>Selectionner un historique</h2>
                  <IonButton fill="clear" color="medium" onClick={() => setShowHistoryPicker(false)}>
                    <IonIcon icon={closeOutline} />
                  </IonButton>
                </div>
                <IonText color="medium">
                  <p>
                    Ordonnance <strong>{getPrescriptionCode(prescription)}</strong> · Patient <strong>{patientDisplayName}</strong>
                  </p>
                </IonText>
                <IonCard className="surface-card" style={{ margin: '8px 0' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={documentTextOutline} />
                        Contexte ordonnance
                      </span>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => setIsPrescriptionContextCollapsed((prev) => !prev)}
                      >
                        <IonIcon icon={isPrescriptionContextCollapsed ? chevronDownOutline : chevronUpOutline} />
                      </IonButton>
                    </IonCardTitle>
                  </IonCardHeader>
                  {!isPrescriptionContextCollapsed ? (
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <IonBadge color="light">Code: {getPrescriptionCode(prescription)}</IonBadge>
                        <IonBadge color="light">Statut: {getPrescriptionStatusLabel(prescription.status)}</IonBadge>
                        <IonBadge color="light">{medicineCount} medicament(s)</IonBadge>
                        <IonBadge color="light">Quantite totale: {totalQuantity}</IonBadge>
                      </div>
                      <p style={{ margin: '8px 0 0 0' }}>Date: {formatDateTime(prescription.requested_at)}</p>
                      <div style={{ marginTop: '6px', display: 'grid', gap: '4px' }}>
                        {prescription.medicine_requests.map((med) => (
                          <p key={`ctx-med-${med.id}`} style={{ margin: 0 }}>
                            <strong>{med.name}</strong> · {med.form || 'N/D'} · {med.strength || 'N/D'} · Qt: {med.quantity ?? 1}
                            {' · '}Dose/jour: {med.daily_dosage ?? 'N/D'} · Note: {(med.notes ?? '').trim() || 'Sans note'}
                          </p>
                        ))}
                      </div>
                    </IonCardContent>
                  ) : null}
                </IonCard>
                <IonInput
                  value={historyQuery}
                  placeholder="Rechercher code, titre, type..."
                  onIonInput={(event) => setHistoryQuery(event.detail.value ?? '')}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <IonButton size="small" fill={historyStatusFilter === 'all' ? 'solid' : 'outline'} onClick={() => setHistoryStatusFilter('all')}>
                    Tous
                  </IonButton>
                  <IonButton size="small" fill={historyStatusFilter === 'active' ? 'solid' : 'outline'} onClick={() => setHistoryStatusFilter('active')}>
                    Actif
                  </IonButton>
                  <IonButton size="small" fill={historyStatusFilter === 'resolved' ? 'solid' : 'outline'} onClick={() => setHistoryStatusFilter('resolved')}>
                    Resolue
                  </IonButton>
                  <IonButton
                    size="small"
                    fill={historyVisibilityFilter === 'shared' ? 'solid' : 'outline'}
                    onClick={() => setHistoryVisibilityFilter(historyVisibilityFilter === 'shared' ? 'all' : 'shared')}
                  >
                    Partage
                  </IonButton>
                  <IonButton
                    size="small"
                    fill={historyVisibilityFilter === 'doctor_only' ? 'solid' : 'outline'}
                    onClick={() => setHistoryVisibilityFilter(historyVisibilityFilter === 'doctor_only' ? 'all' : 'doctor_only')}
                  >
                    Docteur seulement
                  </IonButton>
                </div>

                {loadingHistoryEntries ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: '160px' }}>
                    <IonSpinner name="crescent" />
                  </div>
                ) : filteredHistoryEntries.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucune entree d'historique disponible pour ce patient.</p>
                  </IonText>
                ) : (
                  <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                    {filteredHistoryEntries.map((entry) => (
                      <IonCard key={entry.id} className="surface-card" style={{ margin: 0 }}>
                        <IonCardContent>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <h3 id={`history-code-${entry.id}`} style={{ margin: 0 }}>
                              {entry.entry_code ?? `MH-${entry.id}`}
                            </h3>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <IonBadge color={entry.status === 'resolved' ? 'success' : 'warning'}>
                                {entry.status === 'resolved' ? 'Resolue' : 'Actif'}
                              </IonBadge>
                              <IonBadge color={entry.visibility === 'shared' ? 'primary' : 'dark'}>
                                {entry.visibility === 'shared' ? 'Partage' : 'Docteur seulement'}
                              </IonBadge>
                            </div>
                          </div>
                          <p id={`history-title-${entry.id}`} style={{ margin: '4px 0 0 0', fontWeight: 700 }}>
                            {entry.title}
                          </p>
                          <p style={{ margin: '2px 0 0 0' }}>
                            {entry.type} · Debut: {entry.started_at ? formatDateHaiti(entry.started_at) : 'N/D'} · Fin:{' '}
                            {entry.ended_at ? formatDateHaiti(entry.ended_at) : 'N/D'}
                          </p>
                          {entry.details ? <p id={`history-details-${entry.id}`} style={{ margin: '2px 0 0 0' }}>{entry.details}</p> : null}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                            <IonButton size="small" onClick={() => linkPrescriptionToHistory(entry).catch(() => undefined)}>
                              Selectionner
                            </IonButton>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </div>
                )}
                {historyPickerError ? (
                  <IonText color="danger">
                    <p>{historyPickerError}</p>
                  </IonText>
                ) : null}
              </IonContent>
            </IonModal>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={flaskOutline} />
                  Medicaments
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {prescription.medicine_requests.map((med) => (
                    <div key={med.id} style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '10px' }}>
                      <h3 style={{ margin: 0, fontWeight: 800 }}>{med.name}</h3>
                      <p style={{ margin: '4px 0 0 0' }}>
                        {med.form || 'Sans forme'} · {med.strength || 'Sans dosage'}
                      </p>
                      <p style={{ margin: '2px 0 0 0' }}>
                        Quantite: {med.quantity ?? 1} · Duree: {med.duration_days ?? '-'} j · Dose/jour: {med.daily_dosage ?? '-'}
                      </p>
                      <p style={{ margin: '2px 0 0 0' }}>Note: {med.notes ?? '-'}</p>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={businessOutline} />
                  Disponibilite pharmacies
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {pharmacyCoverage.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucune confirmation pharmacie pour le moment.</p>
                  </IonText>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {pharmacyCoverage.map((row) => (
                      <div key={row.pharmacyId} style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '10px' }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>Pharmacie #{row.pharmacyId}</p>
                        <p style={{ margin: '4px 0 0 0' }}>
                          Couverture: {row.coveredCount}/{medicineCount}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorPrescriptionDetailPage;
