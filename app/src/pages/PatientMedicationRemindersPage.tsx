import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiPatientMedicineCabinetItem } from '../services/api';
import { useAuth } from '../state/AuthState';

type ReminderEvent = {
  itemId: number;
  medication: string;
  time: string;
  minutes: number;
  isTodayUpcoming: boolean;
};

const parseTimeToMinutes = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const PatientMedicationRemindersPage: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<ApiPatientMedicineCabinetItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api.getPatientCabinetItems(token)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les rappels.'))
      .finally(() => setLoading(false));
  }, [token]);

  const familyMemberOptions = useMemo(() => {
    const seen = new Map<number, string>();
    items.forEach((item) => {
      if (item.family_member_id && item.family_member_name) {
        seen.set(item.family_member_id, item.family_member_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const filterCards = useMemo(
    () => [
      { value: 'all', label: 'Tous' },
      { value: 'me', label: 'Moi' },
      ...familyMemberOptions.map((option) => ({ value: String(option.id), label: option.name })),
    ],
    [familyMemberOptions],
  );

  const overview = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const hasValidExpiration = (item: ApiPatientMedicineCabinetItem) => {
      if (!item.expiration_date) return true;
      const exp = new Date(`${item.expiration_date}T00:00:00`);
      if (Number.isNaN(exp.getTime())) return true;
      return exp.getTime() >= todayDate.getTime();
    };

    const scopedItems = items.filter((item) => {
      if (selectedMember === 'all') return true;
      if (selectedMember === 'me') return !item.family_member_id;
      return String(item.family_member_id ?? '') === selectedMember;
    });

    const activeItems = scopedItems.filter((item) => item.reminder_times.length > 0 && hasValidExpiration(item));
    const events: ReminderEvent[] = activeItems.flatMap((item) =>
      item.reminder_times
        .map((time) => {
          const minutes = parseTimeToMinutes(time);
          if (minutes === null) return null;
          return {
            itemId: item.id,
            medication: item.medication_name,
            time,
            minutes,
            isTodayUpcoming: minutes >= currentMinutes,
          };
        })
        .filter((row): row is ReminderEvent => row !== null)
    );

    const upcomingToday = [...events].filter((event) => event.isTodayUpcoming).sort((a, b) => a.minutes - b.minutes);
    const allByTime = [...events].sort((a, b) => a.minutes - b.minutes);

    const byMedicine = activeItems.map((item) => ({
      id: item.id,
      medication: item.medication_name,
      familyMember: item.family_member_name ?? 'Moi',
      times: [...item.reminder_times]
        .filter((time) => parseTimeToMinutes(time) !== null)
        .sort((a, b) => (parseTimeToMinutes(a) ?? 0) - (parseTimeToMinutes(b) ?? 0)),
      dailyDosage: item.daily_dosage,
      note: item.note,
    }));

    return {
      medicinesWithReminders: activeItems.length,
      upcomingToday,
      allByTime,
      byMedicine,
    };
  }, [items, selectedMember]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Rappels medicaments</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />

        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color="primary">{overview.medicinesWithReminders} medicament(s) avec rappel</IonBadge>
              <IonBadge color="warning">{overview.upcomingToday.length} prise(s) restante(s) aujourd&apos;hui</IonBadge>
            </div>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Filtrer par membre</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                {filterCards.map((card) => {
                  const isActive = selectedMember === card.value;
                  return (
                    <IonCard
                      key={card.value}
                      button
                      style={{
                        margin: 0,
                        minWidth: '110px',
                        border: isActive ? '2px solid var(--ion-color-primary)' : '1px solid #dbe7ef',
                        background: isActive ? 'rgba(var(--ion-color-primary-rgb), 0.08)' : '#ffffff',
                      }}
                      onClick={() => setSelectedMember(card.value)}
                    >
                      <IonCardContent style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--ion-color-primary)' : '#0f172a' }}>
                          {card.label}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  );
                })}
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : loading ? (
          <IonText color="medium">
            <p>Chargement...</p>
          </IonText>
        ) : overview.medicinesWithReminders === 0 ? (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="medium">
                <p>Aucun rappel configure. Ajoutez des heures dans "Mes medicaments".</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            <IonCard className="surface-card">
              <IonCardContent>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Prochaines prises aujourd&apos;hui</div>
                {overview.upcomingToday.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucune autre prise aujourd&apos;hui.</p>
                  </IonText>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {overview.upcomingToday.map((event, idx) => (
                      <div key={`${event.itemId}-${event.time}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{event.medication}</span>
                        <IonBadge color={idx === 0 ? 'success' : 'light'}>{event.time}</IonBadge>
                      </div>
                    ))}
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardContent>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Planning journalier (toutes prises)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {overview.allByTime.map((event, idx) => (
                    <div key={`daily-${event.itemId}-${event.time}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>{event.medication}</span>
                      <IonBadge color="light">{event.time}</IonBadge>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overview.byMedicine.map((group) => (
                <IonCard key={group.id} className="surface-card" style={{ margin: 0 }}>
                  <IonCardContent>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{group.medication}</div>
                    <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '8px' }}>
                      {group.familyMember} {group.dailyDosage ? `· ${group.dailyDosage}/jour` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {group.times.map((time) => (
                        <IonBadge key={`${group.id}-${time}`} color="tertiary">{time}</IonBadge>
                      ))}
                    </div>
                    {group.note ? (
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                        Note: {group.note}
                      </div>
                    ) : null}
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PatientMedicationRemindersPage;
