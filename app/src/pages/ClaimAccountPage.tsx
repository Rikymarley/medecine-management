import {
  IonBackButton,
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
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { api } from '../services/api';
import { maskHaitiPhone } from '../utils/phoneMask';

const extractTokenFromScan = (raw: string): string => {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^[A-Za-z0-9]{8,64}$/.test(value)) return value.toUpperCase();
  try {
    const url = new URL(value);
    const fromToken = url.searchParams.get('token') || url.searchParams.get('claim_token');
    return (fromToken || '').toUpperCase();
  } catch {
    return '';
  }
};

const ClaimAccountPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [resolvedName, setResolvedName] = useState<string>('');
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [loadingResolve, setLoadingResolve] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initial = (params.get('token') || params.get('claim_token') || '').trim();
    if (initial) {
      setToken(initial.toUpperCase());
    }
  }, [location.search]);

  useEffect(() => {
    let active = true;
    type BarcodeDetection = { rawValue?: string };
    type BarcodeDetectorInstance = { detect: (source: HTMLCanvasElement) => Promise<BarcodeDetection[]> };
    type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorInstance;
    const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

    const stopCamera = () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !BarcodeDetectorCtor) {
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (!active) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scan = async () => {
          if (!active || !videoRef.current || !ctx) return;
          const video = videoRef.current;
          if (video.readyState >= 2) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              const detected = await detector.detect(canvas);
              if (detected?.length) {
                const maybeToken = extractTokenFromScan(detected[0]?.rawValue || '');
                if (maybeToken) {
                  setToken(maybeToken);
                  stopCamera();
                  return;
                }
              }
            } catch {
              // keep scanning
            }
          }
          rafRef.current = window.requestAnimationFrame(scan);
        };
        rafRef.current = window.requestAnimationFrame(scan);
      } catch {
        setCameraError('Camera indisponible. Vous pouvez saisir le token manuellement.');
      }
    };

    void start();
    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!token.trim()) {
      setResolvedName('');
      setResolveError(null);
      return;
    }

    let active = true;
    setLoadingResolve(true);
    setResolveError(null);

    api.resolveClaimToken(token.trim())
      .then((res) => {
        if (!active) return;
        setResolvedName(res.name);
      })
      .catch((err) => {
        if (!active) return;
        setResolvedName('');
        setResolveError(err instanceof Error ? err.message : 'Token invalide.');
      })
      .finally(() => {
        if (!active) return;
        setLoadingResolve(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const canSubmit = useMemo(
    () => !!token.trim() && !!resolvedName && !!email.trim() && !!password && !!passwordConfirmation,
    [email, password, passwordConfirmation, resolvedName, token]
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.claimFamilyMemberAccount({
        token: token.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
      });
      setSuccess('Compte reclame. Vous pouvez maintenant vous connecter.');
      setTimeout(() => history.replace('/login'), 1000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Echec de reclamation du compte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" />
          </IonButtons>
          <IonTitle>Reclamer un compte</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Scanner le QR code</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', borderRadius: '12px', background: '#000', minHeight: '220px' }}
            />
            {cameraError ? <IonText color="medium"><p>{cameraError}</p></IonText> : null}
            <IonItem lines="none">
              <IonLabel position="stacked">Token de reclamation</IonLabel>
              <IonInput value={token} onIonInput={(e) => setToken((e.detail.value ?? '').toUpperCase())} />
            </IonItem>
            {loadingResolve ? <IonText color="medium"><p>Verification du token...</p></IonText> : null}
            {resolveError ? <IonText color="danger"><p>{resolveError}</p></IonText> : null}
            {resolvedName ? <IonText color="success"><p>Compte detecte: {resolvedName}</p></IonText> : null}
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Finaliser le compte</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem lines="none">
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput type="email" value={email} onIonInput={(e) => setEmail(e.detail.value ?? '')} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Telephone (optionnel)</IonLabel>
              <IonInput
                value={phone}
                maxlength={14}
                inputmode="tel"
                onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">WhatsApp (optionnel)</IonLabel>
              <IonInput
                value={whatsapp}
                maxlength={14}
                inputmode="tel"
                onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
              />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Mot de passe</IonLabel>
              <IonInput type="password" value={password} onIonInput={(e) => setPassword(e.detail.value ?? '')} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Confirmer mot de passe</IonLabel>
              <IonInput type="password" value={passwordConfirmation} onIonInput={(e) => setPasswordConfirmation(e.detail.value ?? '')} />
            </IonItem>
            {submitError ? <IonText color="danger"><p>{submitError}</p></IonText> : null}
            {success ? <IonText color="success"><p>{success}</p></IonText> : null}
            <IonButton expand="block" style={{ marginTop: '12px' }} disabled={!canSubmit || submitting} onClick={() => submit().catch(() => undefined)}>
              Reclamer le compte
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default ClaimAccountPage;
