import {
  IonActionSheet,
  IonBadge,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  addOutline,
  barcodeOutline,
  closeOutline,
  documentTextOutline,
  flaskOutline,
  medkitOutline,
  removeOutline,
  qrCodeOutline,
  scanOutline,
  timeOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { ApiMedicine, ApiPharmacy, ApiPrescription, api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { formatDateTime } from '../utils/time';
import './PharmacyPosHomePage.css';

type PosCartItem = {
  key: string;
  name: string;
  strength: string | null;
  form: string | null;
  quantity: number;
  unitPrice: number | null;
};

const DEFAULT_UNIT_PRICE_HTG = 250;
type PosShiftState = {
  isOpen: boolean;
  openedAt: string | null;
  closedAt: string | null;
  salesCount: number;
  mustCloseAfterSale: boolean;
  openerName: string | null;
  openingCashUsd: number;
  openingCashHtg: number;
  salesCashUsd: number;
  salesCashHtg: number;
  salesMoncash: number;
  salesNatcash: number;
  salesCard: number;
  salesTransfer: number;
  salesOther: number;
};
type PosPaymentMethod = 'cash_htg' | 'cash_usd' | 'moncash' | 'natcash' | 'card' | 'transfer' | 'other';
type PosPaymentSplit = {
  id: string;
  method: PosPaymentMethod;
  amount: number;
};
const PAYMENT_METHOD_OPTIONS: Array<{ value: PosPaymentMethod; label: string }> = [
  { value: 'cash_htg', label: 'Cash HTG' },
  { value: 'cash_usd', label: 'Cash USD' },
  { value: 'moncash', label: 'MonCash' },
  { value: 'natcash', label: 'NatCash' },
  { value: 'card', label: 'Carte' },
  { value: 'transfer', label: 'Virement' },
  { value: 'other', label: 'Autre' }
];

const PharmacyPosHomePage: React.FC = () => {
  const { token, user } = useAuth();
  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [showPrescriptionOptions, setShowPrescriptionOptions] = useState(false);
  const [showShiftSection, setShowShiftSection] = useState(true);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [loadedPrescription, setLoadedPrescription] = useState<ApiPrescription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingMedicines, setSearchingMedicines] = useState(false);
  const [searchResults, setSearchResults] = useState<ApiMedicine[]>([]);
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [showMultiPayment, setShowMultiPayment] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<PosPaymentSplit[]>([]);
  const [showSaleDoneNotice, setShowSaleDoneNotice] = useState(false);
  const [shiftState, setShiftState] = useState<PosShiftState>({
    isOpen: false,
    openedAt: null,
    closedAt: null,
    salesCount: 0,
    mustCloseAfterSale: false,
    openerName: null,
    openingCashUsd: 0,
    openingCashHtg: 0,
    salesCashUsd: 0,
    salesCashHtg: 0,
    salesMoncash: 0,
    salesNatcash: 0,
    salesCard: 0,
    salesTransfer: 0,
    salesOther: 0
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPharmacy = async () => {
      if (!token || !user?.pharmacy_id) {
        return;
      }
      try {
        const pharmacies = await api.getPharmacies();
        const found = pharmacies.find((item) => item.id === user.pharmacy_id) ?? null;
        setPharmacy(found);
      } catch {
        setPharmacy(null);
      }
    };

    void loadPharmacy();
  }, [token, user?.pharmacy_id]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      try {
        setSearchingMedicines(true);
        const medicines = await api.getMedicines({ q, limit: 8 });
        if (isActive) {
          setSearchResults(medicines);
        }
      } catch {
        if (isActive) {
          setSearchResults([]);
        }
      } finally {
        if (isActive) {
          setSearchingMedicines(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const pageTitle = useMemo(() => {
    return pharmacy?.name || user?.name || 'POS Pharmacie';
  }, [pharmacy?.name, user?.name]);
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * (item.unitPrice ?? DEFAULT_UNIT_PRICE_HTG),
        0
      ),
    [cartItems]
  );
  const tax = useMemo(() => subtotal * 0.1, [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);
  const paymentTotal = useMemo(
    () => paymentSplits.reduce((sum, split) => sum + (Number.isFinite(split.amount) ? split.amount : 0), 0),
    [paymentSplits]
  );
  const paymentRemaining = useMemo(() => grandTotal - paymentTotal, [grandTotal, paymentTotal]);
  const shiftStorageKey = useMemo(() => `pharmacy-pos-shift-${user?.id ?? 'anon'}`, [user?.id]);
  const canSell = shiftState.isOpen && !shiftState.mustCloseAfterSale;

  useEffect(() => {
    const raw = window.localStorage.getItem(shiftStorageKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PosShiftState;
      if (typeof parsed?.isOpen === 'boolean') {
        setShiftState(parsed);
      }
    } catch {
      // ignore invalid cached value
    }
  }, [shiftStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(shiftStorageKey, JSON.stringify(shiftState));
  }, [shiftState, shiftStorageKey]);

  useEffect(() => {
    if (!showSaleDoneNotice) {
      return;
    }
    const timer = window.setTimeout(() => setShowSaleDoneNotice(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showSaleDoneNotice]);

  const buildMedicineKey = (medicine: {
    name: string;
    strength?: string | null;
    form?: string | null;
  }) =>
    `${medicine.name.toLowerCase()}|${(medicine.strength ?? '').toLowerCase()}|${(medicine.form ?? '').toLowerCase()}`;

  const normalizePrescriptionLookupValue = (rawValue: string): string => {
    const value = rawValue.trim();
    if (!value) return '';
    const ordCodeMatch = value.match(/ORD-\d{8}-\d{6}/i);
    if (ordCodeMatch?.[0]) {
      return ordCodeMatch[0].toUpperCase();
    }
    const queryCodeMatch = value.match(/[?&](code|print_code|prescription_code)=([^&#]+)/i);
    if (queryCodeMatch?.[2]) {
      return decodeURIComponent(queryCodeMatch[2]).trim().toUpperCase();
    }
    return value.toUpperCase();
  };

  const addMedicineToCart = (medicine: {
    name: string;
    strength?: string | null;
    form?: string | null;
  }) => {
    if (!canSell) {
      setToastMessage(
        shiftState.mustCloseAfterSale
          ? 'Fermez le shift avant une nouvelle vente.'
          : 'Ouvrez un shift pour commencer a vendre.'
      );
      return;
    }
    const key = buildMedicineKey(medicine);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        setToastMessage('Ce medicament est deja dans votre panier.');
        return prev;
      }
      return [
        ...prev,
        {
          key,
          name: medicine.name,
          strength: medicine.strength ?? null,
          form: medicine.form ?? null,
          quantity: 1,
          unitPrice: DEFAULT_UNIT_PRICE_HTG
        }
      ];
    });
    setToastMessage(`${medicine.name} ajoute au panier.`);
  };

  const updateCartQuantity = (key: string, quantity: number) => {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    setCartItems((prev) => prev.map((item) => (item.key === key ? { ...item, quantity: safeQuantity } : item)));
  };

  const incrementCartItem = (key: string) => {
    setCartItems((prev) => prev.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item)));
  };

  const decrementCartItem = (key: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))
    );
  };

  const removeCartItem = (key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const openShift = () => {
    const openerName = (window.prompt('Nom de l’utilisateur qui ouvre le shift:') ?? '').trim();
    if (!openerName) {
      setToastMessage('Le nom est obligatoire pour ouvrir le shift.');
      return;
    }

    const openingUsdRaw = (window.prompt('Fond de caisse en USD:') ?? '').trim();
    const openingUsd = Number(openingUsdRaw);
    if (!openingUsdRaw || !Number.isFinite(openingUsd) || openingUsd < 0) {
      setToastMessage('Fond de caisse USD invalide.');
      return;
    }

    const openingHtgRaw = (window.prompt('Fond de caisse en HTG:') ?? '').trim();
    const openingHtg = Number(openingHtgRaw);
    if (!openingHtgRaw || !Number.isFinite(openingHtg) || openingHtg < 0) {
      setToastMessage('Fond de caisse HTG invalide.');
      return;
    }

    setShiftState({
      isOpen: true,
      openedAt: new Date().toISOString(),
      closedAt: null,
      salesCount: 0,
      mustCloseAfterSale: false,
      openerName,
      openingCashUsd: openingUsd,
      openingCashHtg: openingHtg,
      salesCashUsd: 0,
      salesCashHtg: 0,
      salesMoncash: 0,
      salesNatcash: 0,
      salesCard: 0,
      salesTransfer: 0,
      salesOther: 0
    });
    setToastMessage('Shift ouvert. Vous pouvez commencer a vendre.');
  };

  const closeShift = () => {
    const closedAtIso = new Date().toISOString();
    const openingUsd = shiftState.openingCashUsd;
    const openingHtg = shiftState.openingCashHtg;
    const salesUsd = shiftState.salesCashUsd;
    const salesHtg = shiftState.salesCashHtg;
    const expectedClosingUsd = openingUsd + salesUsd;
    const expectedClosingHtg = openingHtg + salesHtg;

    const reportHtml = `
      <html>
        <head>
          <title>Rapport Shift POS</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            h2 { margin: 20px 0 10px; font-size: 16px; }
            p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 14px; }
            th { background: #f3f4f6; }
            .muted { color: #6b7280; font-size: 13px; }
            .strong { font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Rapport de fin de shift POS</h1>
          <p class="muted">${pageTitle}</p>
          <p><span class="strong">Ouvert par:</span> ${shiftState.openerName ?? 'N/D'}</p>
          <p><span class="strong">Heure ouverture:</span> ${shiftState.openedAt ? formatDateTime(shiftState.openedAt) : 'N/D'}</p>
          <p><span class="strong">Heure fermeture:</span> ${formatDateTime(closedAtIso)}</p>
          <p><span class="strong">Nombre de ventes:</span> ${shiftState.salesCount}</p>

          <h2>Fond de caisse initial</h2>
          <table>
            <tr><th>Devise</th><th>Montant</th></tr>
            <tr><td>USD</td><td>${openingUsd.toFixed(2)}</td></tr>
            <tr><td>HTG</td><td>${openingHtg.toFixed(2)}</td></tr>
          </table>

          <h2>Ventes par methode</h2>
          <table>
            <tr><th>Methode</th><th>Montant</th></tr>
            <tr><td>Cash USD</td><td>${shiftState.salesCashUsd.toFixed(2)}</td></tr>
            <tr><td>Cash HTG</td><td>${shiftState.salesCashHtg.toFixed(2)}</td></tr>
            <tr><td>MonCash</td><td>${shiftState.salesMoncash.toFixed(2)}</td></tr>
            <tr><td>NatCash</td><td>${shiftState.salesNatcash.toFixed(2)}</td></tr>
            <tr><td>Carte</td><td>${shiftState.salesCard.toFixed(2)}</td></tr>
            <tr><td>Virement</td><td>${shiftState.salesTransfer.toFixed(2)}</td></tr>
            <tr><td>Autre</td><td>${shiftState.salesOther.toFixed(2)}</td></tr>
          </table>

          <h2>Balance de fermeture attendue</h2>
          <table>
            <tr><th>Devise</th><th>Montant attendu</th></tr>
            <tr><td>USD (Fond + ventes cash USD)</td><td>${expectedClosingUsd.toFixed(2)}</td></tr>
            <tr><td>HTG (Fond + ventes cash HTG)</td><td>${expectedClosingHtg.toFixed(2)}</td></tr>
          </table>

          <p class="muted" style="margin-top: 16px;">Document genere automatiquement pour balance de fin de shift.</p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      setToastMessage('Impossible d’ouvrir la fenetre d’impression (popup bloquee).');
    }

    setShiftState((prev) => ({
      ...prev,
      isOpen: false,
      closedAt: closedAtIso,
      mustCloseAfterSale: false,
      openerName: null,
      openingCashUsd: 0,
      openingCashHtg: 0,
      salesCashUsd: 0,
      salesCashHtg: 0,
      salesMoncash: 0,
      salesNatcash: 0,
      salesCard: 0,
      salesTransfer: 0,
      salesOther: 0
    }));
    setLoadedPrescription(null);
    setSearchQuery('');
    setSearchResults([]);
    setCartItems([]);
    setShowMultiPayment(false);
    setPaymentSplits([]);
    setToastMessage('Shift ferme.');
  };

  const handleOpenPayment = () => {
    if (!canSell) {
      setToastMessage(
        shiftState.mustCloseAfterSale
          ? 'Fermez le shift avant de continuer.'
          : 'Ouvrez un shift avant le paiement.'
      );
      return;
    }
    if (cartItems.length === 0) {
      setToastMessage('Panier vide.');
      return;
    }
    if (paymentSplits.length === 0) {
      setPaymentSplits([
        { id: `pay-${Date.now()}-1`, method: 'cash_htg', amount: Number(grandTotal.toFixed(2)) },
        { id: `pay-${Date.now()}-2`, method: 'moncash', amount: 0 }
      ]);
    }
    setShowMultiPayment(true);
    setToastMessage('Section paiement ouverte.');
  };

  const addPaymentSplit = () => {
    setPaymentSplits((prev) => [
      ...prev,
      { id: `pay-${Date.now()}-${prev.length + 1}`, method: 'other', amount: 0 }
    ]);
  };

  const updatePaymentSplitMethod = (id: string, method: PosPaymentMethod) => {
    setPaymentSplits((prev) => prev.map((split) => (split.id === id ? { ...split, method } : split)));
  };

  const updatePaymentSplitAmount = (id: string, amount: number) => {
    const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    setPaymentSplits((prev) => prev.map((split) => (split.id === id ? { ...split, amount: safe } : split)));
  };

  const removePaymentSplit = (id: string) => {
    setPaymentSplits((prev) => prev.filter((split) => split.id !== id));
  };

  const validateAndPay = () => {
    const roundedRemaining = Number(paymentRemaining.toFixed(2));
    if (Math.abs(roundedRemaining) > 0.01) {
      setToastMessage(
        roundedRemaining > 0
          ? `Montant restant: ${roundedRemaining.toFixed(0)} HTG`
          : `Surpaiement: ${Math.abs(roundedRemaining).toFixed(0)} HTG`
      );
      return;
    }
    setToastMessage('Paiement valide et enregistre.');
    const salesDelta = paymentSplits.reduce(
      (acc, split) => {
        const amount = Number.isFinite(split.amount) ? split.amount : 0;
        if (split.method === 'cash_usd') acc.salesCashUsd += amount;
        if (split.method === 'cash_htg') acc.salesCashHtg += amount;
        if (split.method === 'moncash') acc.salesMoncash += amount;
        if (split.method === 'natcash') acc.salesNatcash += amount;
        if (split.method === 'card') acc.salesCard += amount;
        if (split.method === 'transfer') acc.salesTransfer += amount;
        if (split.method === 'other') acc.salesOther += amount;
        return acc;
      },
      {
        salesCashUsd: 0,
        salesCashHtg: 0,
        salesMoncash: 0,
        salesNatcash: 0,
        salesCard: 0,
        salesTransfer: 0,
        salesOther: 0
      }
    );
    setShowMultiPayment(false);
    setPaymentSplits([]);
    setCartItems([]);
    setShowSaleDoneNotice(true);
    setShiftState((prev) => ({
      ...prev,
      salesCount: prev.salesCount + 1,
      mustCloseAfterSale: true,
      salesCashUsd: prev.salesCashUsd + salesDelta.salesCashUsd,
      salesCashHtg: prev.salesCashHtg + salesDelta.salesCashHtg,
      salesMoncash: prev.salesMoncash + salesDelta.salesMoncash,
      salesNatcash: prev.salesNatcash + salesDelta.salesNatcash,
      salesCard: prev.salesCard + salesDelta.salesCard,
      salesTransfer: prev.salesTransfer + salesDelta.salesTransfer,
      salesOther: prev.salesOther + salesDelta.salesOther
    }));
    setLoadedPrescription(null);
    setSearchQuery('');
    setSearchResults([]);
    window.localStorage.removeItem('pharmacy-pos-prescription-code');
    window.localStorage.removeItem('pharmacy-pos-prescription-id');
    window.localStorage.removeItem('pharmacy-pos-open-from');
  };

  const loadPrescriptionByCode = async (rawInput: string) => {
    const normalized = normalizePrescriptionLookupValue(rawInput);
    if (!normalized || !token) {
      setToastMessage('Code ordonnance invalide.');
      return;
    }

    setLoadingPrescription(true);
    try {
      const prescriptions = await api.getPharmacyPrescriptions(token);
      const found =
        prescriptions.find((item) => getPrescriptionCode(item).toUpperCase() === normalized) ??
        prescriptions.find((item) => String(item.id) === normalized) ??
        null;

      if (!found) {
        setLoadedPrescription(null);
        setToastMessage('Aucune ordonnance trouvee pour ce code.');
        return;
      }

      setLoadedPrescription(found);
      setToastMessage(`Ordonnance chargee: ${getPrescriptionCode(found)}`);
    } catch {
      setToastMessage('Erreur lors du chargement de l’ordonnance.');
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handleScanQrOption = () => {
    const value = window.prompt('Scanner QR: collez ici le contenu du QR code ordonnance.');
    if (value) {
      void loadPrescriptionByCode(value);
    }
  };

  const handleTypeCodeOption = () => {
    const value = window.prompt('Saisissez le code ordonnance (ex: ORD-20260420-000129).');
    if (value) {
      void loadPrescriptionByCode(value);
    }
  };

  const handleScanProductBarcode = async () => {
    if (!canSell) {
      setToastMessage(
        shiftState.mustCloseAfterSale
          ? 'Fermez le shift avant une nouvelle vente.'
          : 'Ouvrez un shift pour scanner un produit.'
      );
      return;
    }
    const barcode = window.prompt('Scanner code-barres: collez ici le code produit.');
    if (!barcode) {
      return;
    }
    const q = barcode.trim();
    if (!q) {
      return;
    }
    setSearchQuery(q);
    try {
      const medicines = await api.getMedicines({ q, limit: 1 });
      if (!medicines.length) {
        setToastMessage('Aucun medicament trouve pour ce code-barres.');
        return;
      }
      const medicine = medicines[0];
      addMedicineToCart({
        name: medicine.name,
        strength: medicine.strength,
        form: medicine.form
      });
    } catch {
      setToastMessage('Erreur pendant la lecture du code-barres.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/pharmacy" />
          </IonButtons>
          <IonTitle>{pageTitle}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              size="small"
              fill="clear"
              onClick={() => setShowShiftSection((prev) => !prev)}
              aria-label="Afficher ou masquer section shift"
            >
              <IonIcon icon={timeOutline} slot="icon-only" style={{ fontSize: '28px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <div className="pos-left-column">
          <IonCard className="surface-card">
            <IonCardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <IonCardTitle>Vente rapide</IonCardTitle>
                  <IonCardSubtitle>Recherche par nom, code ou scan</IonCardSubtitle>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <IonButton
                    size="small"
                    fill="clear"
                    disabled={!shiftState.isOpen}
                    onClick={() => setShowPrescriptionOptions(true)}
                  >
                    <IonIcon icon={documentTextOutline} slot="icon-only" style={{ fontSize: '35px' }} />
                  </IonButton>
                </div>
              </div>
            </IonCardHeader>
            <IonCardContent>
              {showShiftSection ? (
                <>
                  <IonItem lines="full">
                    <IonIcon icon={timeOutline} slot="start" />
                    <IonLabel>
                      <h3>Shift POS</h3>
                      <p>
                        {shiftState.isOpen
                          ? `Ouvert${shiftState.openedAt ? `: ${formatDateTime(shiftState.openedAt)}` : ''}`
                          : 'Aucun shift ouvert'}
                        {shiftState.salesCount > 0 ? ` • Ventes: ${shiftState.salesCount}` : ''}
                      </p>
                      {shiftState.isOpen ? (
                        <p>
                          Ouvre par: {shiftState.openerName ?? 'N/D'} • Fond: {shiftState.openingCashUsd} USD /{' '}
                          {shiftState.openingCashHtg} HTG
                        </p>
                      ) : null}
                      {shiftState.isOpen ? (
                        <p>
                          Ventes: {shiftState.salesCashUsd.toFixed(2)} USD / {shiftState.salesCashHtg.toFixed(0)} HTG /
                          {' '}MonCash {shiftState.salesMoncash.toFixed(0)} / NatCash {shiftState.salesNatcash.toFixed(0)} /
                          {' '}Carte {shiftState.salesCard.toFixed(0)} / Virement {shiftState.salesTransfer.toFixed(0)} /
                          {' '}Autre {shiftState.salesOther.toFixed(0)}
                        </p>
                      ) : null}
                    </IonLabel>
                    {!shiftState.isOpen ? (
                      <IonButton size="small" slot="end" onClick={openShift}>
                        Ouvrir shift
                      </IonButton>
                    ) : (
                      <IonButton size="small" slot="end" color="warning" onClick={closeShift}>
                        Fermer shift
                      </IonButton>
                    )}
                  </IonItem>
                  {showSaleDoneNotice ? (
                    <IonItem lines="full" color="warning">
                      <IonLabel>
                        <p>Vente terminee.</p>
                      </IonLabel>
                    </IonItem>
                  ) : null}
                </>
              ) : null}
              {loadedPrescription ? (
                <IonItem lines="full">
                  <IonIcon icon={documentTextOutline} slot="start" />
                  <IonLabel>
                    <h3>Ordonnance chargee: {getPrescriptionCode(loadedPrescription)}</h3>
                    <p>
                      {loadedPrescription.patient_name} • {loadedPrescription.medicine_requests.length} medicament(s)
                    </p>
                  </IonLabel>
                  <IonButton
                    size="small"
                    slot="end"
                    disabled={!canSell}
                    onClick={() => {
                      window.localStorage.setItem('pharmacy-pos-prescription-code', getPrescriptionCode(loadedPrescription));
                      window.localStorage.setItem('pharmacy-pos-prescription-id', String(loadedPrescription.id));
                      window.localStorage.setItem('pharmacy-pos-open-from', 'pos');
                      const medicines = loadedPrescription.medicine_requests ?? [];
                      const mapByKey = new Map<string, PosCartItem>();
                      medicines.forEach((medicine) => {
                        const key = buildMedicineKey(medicine);
                        const existing = mapByKey.get(key);
                        if (existing) {
                          existing.quantity += medicine.quantity ?? 1;
                          return;
                        }
                        mapByKey.set(key, {
                          key,
                          name: medicine.name,
                          strength: medicine.strength ?? null,
                          form: medicine.form ?? null,
                          quantity: medicine.quantity ?? 1,
                          unitPrice: DEFAULT_UNIT_PRICE_HTG
                        });
                      });
                      setCartItems(Array.from(mapByKey.values()));
                      setToastMessage('Ordonnance chargee: medicaments ajoutes directement au panier.');
                    }}
                  >
                    Charger
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    slot="end"
                    onClick={() => setLoadedPrescription(null)}
                  >
                    Cacher
                  </IonButton>
                </IonItem>
              ) : null}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonSearchbar
                  value={searchQuery}
                  onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
                  placeholder="Scanner ou rechercher un produit..."
                  style={{ flex: 1 }}
                  disabled={!canSell}
                />
                <IonButton
                  fill="outline"
                  disabled={!canSell}
                  onClick={() => {
                    void handleScanProductBarcode();
                  }}
                  aria-label="Scanner code-barres produit"
                >
                  <IonIcon icon={scanOutline} slot="icon-only" />
                </IonButton>
              </div>
              {searchingMedicines ? (
                <IonItem lines="none">
                  <IonLabel>
                    <p>Recherche en cours...</p>
                  </IonLabel>
                </IonItem>
              ) : null}
              {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
                <IonList inset>
                  {searchResults.map((medicine, index) => (
                    <IonItem
                      key={`search-med-${medicine.id}`}
                      lines={index === searchResults.length - 1 ? 'none' : 'full'}
                      button
                      onClick={() =>
                        addMedicineToCart({
                          name: medicine.name,
                          strength: medicine.strength,
                          form: medicine.form
                        })
                      }
                    >
                      <IonIcon icon={flaskOutline} slot="start" />
                      <IonLabel>
                        <h3>{medicine.name}</h3>
                        <p>{medicine.form ?? 'Forme non precise'} • {medicine.strength ?? 'Dosage non precise'}</p>
                      </IonLabel>
                      <IonBadge color="success" slot="end">
                        Ajouter
                      </IonBadge>
                    </IonItem>
                  ))}
                </IonList>
              ) : null}
              <IonItem lines="full">
                <IonIcon icon={barcodeOutline} slot="start" />
                <IonLabel>
                  <h3>Panier POS</h3>
                  <p>{cartItems.length} medicament(s) selectionne(s)</p>
                </IonLabel>
              </IonItem>
              <IonList inset>
                {cartItems.length > 0 ? (
                  cartItems.map((item, index) => (
                    <IonItem key={item.key} lines={index === cartItems.length - 1 ? 'none' : 'full'}>
                      <IonIcon icon={medkitOutline} slot="start" />
                      <IonLabel>
                        <h3>{item.name}</h3>
                        <p>{item.form ?? 'Forme non precise'} • {item.strength ?? 'Dosage non precise'}</p>
                        <p>
                          Prix: {(item.unitPrice ?? DEFAULT_UNIT_PRICE_HTG)} HTG • Ligne:{' '}
                          {(item.unitPrice ?? DEFAULT_UNIT_PRICE_HTG) * item.quantity} HTG
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <IonButton
                            size="small"
                            fill="clear"
                            onClick={() => decrementCartItem(item.key)}
                            aria-label="Diminuer quantite"
                          >
                            <IonIcon icon={removeOutline} slot="icon-only" />
                          </IonButton>
                          <IonInput
                            type="number"
                            min={1}
                            value={String(item.quantity)}
                            style={{ maxWidth: '72px' }}
                            onIonInput={(e) => updateCartQuantity(item.key, Number(e.detail.value ?? 1))}
                          />
                          <IonButton
                            size="small"
                            fill="clear"
                            onClick={() => incrementCartItem(item.key)}
                            aria-label="Augmenter quantite"
                          >
                            <IonIcon icon={addOutline} slot="icon-only" />
                          </IonButton>
                          <IonButton
                            size="small"
                            color="danger"
                            fill="clear"
                            onClick={() => removeCartItem(item.key)}
                            aria-label="Retirer medicament"
                          >
                            <IonIcon icon={closeOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      </IonLabel>
                    </IonItem>
                  ))
                ) : (
                  <IonItem lines="none">
                    <IonIcon icon={medkitOutline} slot="start" />
                    <IonLabel>
                      <h3>Panier vide</h3>
                      <p>Ajoutez un medicament via recherche ou ordonnance.</p>
                    </IonLabel>
                  </IonItem>
                )}
              </IonList>
              <IonList inset>
                <IonItem lines="full">
                  <IonLabel>Sous-total</IonLabel>
                  <IonBadge slot="end" color="medium">
                    {subtotal.toFixed(0)} HTG
                  </IonBadge>
                </IonItem>
                <IonItem lines="full">
                  <IonLabel>Taxe (10%)</IonLabel>
                  <IonBadge slot="end" color="warning">
                    {tax.toFixed(0)} HTG
                  </IonBadge>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <strong>Grand total</strong>
                  </IonLabel>
                  <IonBadge slot="end" color="success">
                    {grandTotal.toFixed(0)} HTG
                  </IonBadge>
                </IonItem>
              </IonList>
              <div style={{ paddingTop: '8px' }}>
                <IonButton
                  expand="block"
                  color="success"
                  disabled={cartItems.length === 0}
                  onClick={handleOpenPayment}
                >
                  Payer
                </IonButton>
              </div>
              {showMultiPayment ? (
                <IonList inset>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Paiement multi-methode</h3>
                      <p>Cash, MonCash ou autres methodes</p>
                    </IonLabel>
                    <IonButton size="small" slot="end" fill="outline" onClick={addPaymentSplit}>
                      Ajouter ligne
                    </IonButton>
                  </IonItem>
                  {paymentSplits.map((split, index) => (
                    <IonItem key={split.id} lines={index === paymentSplits.length - 1 ? 'none' : 'full'}>
                      <IonLabel style={{ minWidth: '115px', maxWidth: '115px' }}>
                        <IonSelect
                          value={split.method}
                          onIonChange={(e) => updatePaymentSplitMethod(split.id, e.detail.value as PosPaymentMethod)}
                          interface="popover"
                        >
                          {PAYMENT_METHOD_OPTIONS.map((option) => (
                            <IonSelectOption key={option.value} value={option.value}>
                              {option.label}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonLabel>
                      <IonInput
                        type="number"
                        min={0}
                        step="0.01"
                        value={String(split.amount)}
                        onIonInput={(e) => updatePaymentSplitAmount(split.id, Number(e.detail.value ?? 0))}
                      />
                      <IonButton
                        size="small"
                        color="danger"
                        fill="clear"
                        slot="end"
                        onClick={() => removePaymentSplit(split.id)}
                        aria-label="Supprimer ligne paiement"
                      >
                        <IonIcon icon={closeOutline} slot="icon-only" />
                      </IonButton>
                    </IonItem>
                  ))}
                  <IonItem lines="full">
                    <IonLabel>Total paiement saisi</IonLabel>
                    <IonBadge slot="end" color="medium">
                      {paymentTotal.toFixed(0)} HTG
                    </IonBadge>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>Reste a payer</IonLabel>
                    <IonBadge slot="end" color={paymentRemaining > 0 ? 'warning' : 'success'}>
                      {paymentRemaining.toFixed(0)} HTG
                    </IonBadge>
                  </IonItem>
                  <IonItem lines="none">
                    <IonButton expand="block" color="success" onClick={validateAndPay}>
                      Valider paiement
                    </IonButton>
                  </IonItem>
                </IonList>
              ) : null}
            </IonCardContent>
          </IonCard>
        </div>
        <IonActionSheet
          isOpen={showPrescriptionOptions}
          onDidDismiss={() => setShowPrescriptionOptions(false)}
          header="Charger une ordonnance"
          buttons={[
            {
              text: '1 - Scanner le QR code de l’ordonnance',
              icon: qrCodeOutline,
              handler: handleScanQrOption
            },
            {
              text: '2 - Saisir le code ordonnance',
              icon: barcodeOutline,
              handler: handleTypeCodeOption
            },
            {
              text: 'Annuler',
              role: 'cancel'
            }
          ]}
        />
        <IonToast
          isOpen={Boolean(toastMessage)}
          message={loadingPrescription ? 'Chargement...' : toastMessage ?? ''}
          duration={1800}
          onDidDismiss={() => setToastMessage(null)}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default PharmacyPosHomePage;
