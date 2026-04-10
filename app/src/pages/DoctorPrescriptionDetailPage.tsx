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
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { calendarOutline, flaskOutline, personOutline, printOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

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

                <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={calendarOutline} />
                  Demandee le {formatDateTime(prescription.requested_at)}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <IonButton fill="outline" onClick={printPrescription}>
                    <IonIcon icon={printOutline} slot="start" />
                    Reimprimer (QR)
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
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorPrescriptionDetailPage;
