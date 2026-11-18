import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { SmartImage } from '../components/SmartImage';
import { useAuth } from '../context/AuthContext';
import { cartDocId, useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { applySeoMeta } from '../lib/seo';
import { AppTab, formatKsh, normalizeKenyanPhone, PaymentMethod } from '../types/stylah';

interface CartCheckoutViewProps {
  onNavigate: (tab: AppTab) => void;
}

const KENYAN_TOWNS = [
  'Nairobi',
  'Kiambu',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Machakos',
  'Nanyuki',
  'Other Kenya Town',
];

export function CartCheckoutView({ onNavigate }: CartCheckoutViewProps) {
  const { user, profile, privateInfo, resendVerification, refreshUserSession } = useAuth();
  const { cart, cartSubtotalKsh, promotions, settings, serverConfig, updateCartQty, removeFromCart, clearCart } =
    useStore();

  const [customerName, setCustomerName] = useState(profile?.fullName || user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState(privateInfo?.phoneNumber || '');
  const [deliveryTown, setDeliveryTown] = useState(privateInfo?.deliveryTown || 'Nairobi');
  const [deliveryAddress, setDeliveryAddress] = useState(privateInfo?.deliveryAddress || '');
  const [notes, setNotes] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoFeedback, setPromoFeedback] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa_stk');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{
    orderRef: string;
    totalKsh: number;
    mpesaMessage: string;
    mpesaConfigured: boolean;
    checkoutRequestId?: string;
  } | null>(null);

  useEffect(() => {
    applySeoMeta({
      title: 'Cart & M-Pesa Checkout | Stylah Designs & Interiors',
      description: 'Review your Stylah Designs & Interiors cart and complete checkout securely via M-Pesa Daraja STK Push.',
      path: '/checkout',
    });
  }, []);

  useEffect(() => {
    if (!customerName && (profile?.fullName || user?.displayName)) {
      setCustomerName(profile?.fullName || user?.displayName || '');
    }
    if (!customerPhone && privateInfo?.phoneNumber) {
      setCustomerPhone(privateInfo.phoneNumber);
    }
    if (privateInfo?.deliveryTown) setDeliveryTown(privateInfo.deliveryTown);
    if (!deliveryAddress && privateInfo?.deliveryAddress) {
      setDeliveryAddress(privateInfo.deliveryAddress);
    }
  }, [profile, privateInfo, user, customerName, customerPhone, deliveryAddress]);

  const activePromo = promotions.find(
    (p) => p.published && p.code.trim().toUpperCase() === appliedPromoCode.trim().toUpperCase()
  );
  const discountKsh = activePromo
    ? Math.round((cartSubtotalKsh * Math.min(90, Math.max(0, activePromo.discountPercent))) / 100)
    : 0;
  const discountedSubtotal = Math.max(0, cartSubtotalKsh - discountKsh);

  const isOutsideNairobi =
    deliveryTown.toLowerCase() !== 'nairobi' && deliveryTown.toLowerCase() !== 'kiambu';
  const baseDeliveryFee = isOutsideNairobi
    ? Math.max(settings.standardDeliveryFeeKsh, 1200)
    : settings.standardDeliveryFeeKsh;
  const deliveryFeeKsh =
    cartSubtotalKsh === 0 || discountedSubtotal >= settings.freeDeliveryThresholdKsh
      ? 0
      : baseDeliveryFee;
  const grandTotalKsh = Math.max(1, discountedSubtotal + deliveryFeeKsh);

  const handleApplyPromo = () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      setAppliedPromoCode('');
      setPromoFeedback('');
      return;
    }
    const found = promotions.find((p) => p.published && p.code.trim().toUpperCase() === clean);
    if (found) {
      setAppliedPromoCode(found.code.trim().toUpperCase());
      setPromoFeedback(`${found.title} (${found.discountPercent}% off) applied.`);
    } else {
      setAppliedPromoCode('');
      setPromoFeedback('Promo code is invalid or inactive.');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      onNavigate('account');
      return;
    }

    if (!user.emailVerified) {
      setErrorMsg('Please verify your email address before placing an order.');
      return;
    }

    const normalizedPhone = normalizeKenyanPhone(customerPhone);
    if (!normalizedPhone) {
      setErrorMsg('Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).');
      return;
    }

    if (customerName.trim().length < 2 || deliveryAddress.trim().length < 3) {
      setErrorMsg('Please provide your full name and delivery street or estate address.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();

      // 1. Server-side price validation (never trust client totals)
      const valResp = await fetch('/api/orders/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          deliveryTown,
          promoCode: appliedPromoCode || undefined,
        }),
      });

      const valData = (await valResp.json()) as {
        verified?: boolean;
        subtotalKsh?: number;
        deliveryFeeKsh?: number;
        discountKsh?: number;
        totalKsh?: number;
        items?: Array<{ productId: string; unitPriceKsh: number; quantity: number; lineTotalKsh: number }>;
        error?: string;
      };

      if (!valResp.ok || !valData.verified || !valData.totalKsh) {
        throw new Error(valData.error || 'Server price verification failed.');
      }

      const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const orderRef = `STY-${String(Date.now()).slice(-6)}`;
      const firstTitle = cart[0]?.productName || 'Order Items';
      const itemsSummary =
        cart.length > 1 ? `${firstTitle} + ${cart.length - 1} more` : firstTitle;
      const totalItemCount = cart.reduce((acc, c) => acc + c.quantity, 0);

      // 2. Atomic Firestore Batch Write (Order + OrderItems + Customer Notification)
      const batch = writeBatch(db);
      batch.set(doc(db, 'orders', orderId), {
        orderRef,
        customerId: user.uid,
        customerName: customerName.trim().slice(0, 120),
        customerPhone: normalizedPhone,
        customerEmail: user.email || '',
        deliveryTown: deliveryTown.trim().slice(0, 100),
        deliveryAddress: deliveryAddress.trim().slice(0, 300),
        itemsSummary: itemsSummary.slice(0, 200),
        itemCount: totalItemCount,
        subtotalKsh: valData.subtotalKsh,
        deliveryFeeKsh: valData.deliveryFeeKsh ?? 0,
        discountKsh: valData.discountKsh ?? 0,
        totalKsh: valData.totalKsh,
        paymentMethod,
        paymentStatus: paymentMethod === 'mpesa_stk' ? 'pending' : 'unpaid',
        orderStatus: paymentMethod === 'mpesa_stk' ? 'awaiting_payment' : 'pending',
        notes: notes.trim().slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      cart.forEach((item, idx) => {
        const verifiedLine = valData.items?.find((v) => v.productId === item.productId);
        const unitPrice = verifiedLine?.unitPriceKsh ?? item.unitPriceKsh;
        const itemId = `item_${idx}_${item.productId}`.slice(0, 120);
        batch.set(doc(db, 'orders', orderId, 'items', itemId), {
          orderId,
          customerId: user.uid,
          productId: item.productId,
          productName: item.productName.slice(0, 140),
          variant: (item.variant || '').slice(0, 80),
          quantity: item.quantity,
          unitPriceKsh: unitPrice,
          lineTotalKsh: Math.round(unitPrice * item.quantity),
        });
      });

      batch.set(doc(db, 'notifications', `notif_${orderId}`), {
        userId: user.uid,
        title: `Order ${orderRef} Received`,
        message: `Total ${formatKsh(valData.totalKsh)} · ${
          paymentMethod === 'mpesa_stk' ? 'Awaiting M-Pesa confirmation' : 'Pay on Delivery'
        }.`,
        type: 'order',
        read: false,
        linkPath: '/account',
        createdAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.WRITE, `orders/${orderId}`);
      }

      // 3. Initiate M-Pesa Daraja STK Push via Backend if selected
      let mpesaMessage = 'Order placed for Pay on Delivery. Our dispatch team will confirm shortly.';
      let mpesaConfigured = serverConfig.mpesaConfigured;
      let checkoutRequestId: string | undefined;

      if (paymentMethod === 'mpesa_stk') {
        const stkResp = await fetch('/api/mpesa/stkpush', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            orderId,
            orderRef,
            phoneNumber: normalizedPhone,
            amountKsh: valData.totalKsh,
          }),
        });
        const stkData = (await stkResp.json()) as {
          configured?: boolean;
          initiated?: boolean;
          checkoutRequestId?: string;
          customerMessage?: string;
          message?: string;
          error?: string;
        };

        if (stkResp.status === 503 || stkData.configured === false) {
          mpesaConfigured = false;
          mpesaMessage =
            stkData.message ||
            'M-Pesa Daraja credentials are awaiting configuration on the server. Your order is saved as Awaiting Payment.';
        } else if (!stkResp.ok) {
          mpesaMessage = stkData.error || 'STK Push could not be dispatched. Order saved as Awaiting Payment.';
        } else {
          mpesaConfigured = true;
          checkoutRequestId = stkData.checkoutRequestId;
          mpesaMessage =
            stkData.customerMessage ||
            'An M-Pesa STK Push prompt has been sent to your phone. Enter your PIN to complete payment.';
        }
      }

      // 4. Optional Transactional Email Dispatch
      if (user.email) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            to: user.email,
            subject: `Stylah Designs & Interiors Order Confirmation (${orderRef})`,
            text: `Hello ${customerName},\n\nYour order ${orderRef} totaling ${formatKsh(
              valData.totalKsh
            )} has been created.\nDelivery: ${deliveryAddress}, ${deliveryTown}.\nStatus: ${mpesaMessage}`,
          }),
        }).catch(() => undefined);
      }

      await clearCart();
      setCompletedOrder({
        orderRef,
        totalKsh: valData.totalKsh,
        mpesaMessage,
        mpesaConfigured,
        checkoutRequestId,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-10 pb-20">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6 md:p-8 shadow-level-1 space-y-5">
          <div className="flex items-center gap-3 text-[#00a859]">
            <CheckCircle2 className="w-7 h-7 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Order Reference · {completedOrder.orderRef}
              </p>
              <h1 className="font-display text-2xl font-semibold text-[#202020]">
                Order Created Successfully
              </h1>
            </div>
          </div>

          <div className="p-4 rounded bg-[#f8f9fa] border border-[#e5e7eb] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5a403f]">Server-Verified Total</span>
              <span className="font-display font-bold text-[#202020] tabular-nums">
                {formatKsh(completedOrder.totalKsh)}
              </span>
            </div>
            {completedOrder.checkoutRequestId && (
              <div className="flex justify-between text-xs text-[#6b7280]">
                <span>Daraja Checkout ID</span>
                <span className="font-mono">{completedOrder.checkoutRequestId}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-[#5a403f] leading-relaxed">{completedOrder.mpesaMessage}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('account')}
              className="min-h-[48px] px-5 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014]"
            >
              Track Order in Account
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                onNavigate('shop');
              }}
              className="min-h-[48px] px-5 rounded border border-[#e5e7eb] text-sm font-semibold text-[#202020] hover:bg-[#f8f9fa]"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 pb-20">
      <div className="border-b border-[#e5e7eb] pb-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#202020]">
            Shopping Cart &amp; Checkout
          </h1>
          <p className="text-sm text-[#5a403f] mt-1">
            All totals are revalidated by the server before order confirmation.
          </p>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-10 text-center space-y-4">
          <ShoppingBag className="w-8 h-8 text-[#a81825] mx-auto" />
          <h2 className="font-display text-lg font-semibold text-[#202020]">Your Cart is Empty</h2>
          <p className="text-sm text-[#5a403f]">
            Browse architectural wallpapers, wall murals, chandeliers, and CCTV kits in the shop.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="min-h-[48px] px-6 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014]"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-7 space-y-3">
            {cart.map((item) => {
              const key = cartDocId(item.productId, item.variant);
              return (
                <div
                  key={key}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-4 flex items-center gap-4 shadow-level-1"
                >
                  <div className="w-20 h-20 rounded bg-[#f8f9fa] overflow-hidden shrink-0">
                    <SmartImage src={item.imageUrl} alt={item.productName} fallbackTitle={item.productName} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-display text-sm sm:text-base font-semibold text-[#202020] truncate">
                      {item.productName}
                    </h3>
                    {item.variant && <p className="text-xs text-[#6b7280]">{item.variant}</p>}
                    <p className="font-display text-sm font-bold text-[#202020] tabular-nums">
                      {formatKsh(item.unitPriceKsh * item.quantity)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <div className="inline-flex items-center border border-[#e5e7eb] rounded h-11">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateCartQty(key, item.quantity - 1)}
                        className="w-10 h-11 flex items-center justify-center hover:bg-[#f8f9fa]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateCartQty(key, item.quantity + 1)}
                        className="w-10 h-11 flex items-center justify-center hover:bg-[#f8f9fa]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.productName}`}
                      onClick={() => removeFromCart(key)}
                      className="w-11 h-11 rounded border border-[#e5e7eb] flex items-center justify-center text-[#5a403f] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Form */}
          <form
            onSubmit={handleCheckout}
            className="lg:col-span-5 bg-white border border-[#e5e7eb] rounded-lg p-6 shadow-level-1 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-[#202020] border-b border-[#e5e7eb] pb-3">
              Delivery &amp; M-Pesa Checkout
            </h2>

            {!user && (
              <div className="p-3.5 rounded bg-[#f8f9fa] border border-[#e5e7eb] text-xs text-[#5a403f] space-y-2">
                <p>Sign in with Google or Email to complete your order and track delivery.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="min-h-[40px] px-4 rounded bg-[#a81825] text-white font-semibold"
                >
                  Sign In to Checkout
                </button>
              </div>
            )}

            {user && !user.emailVerified && (
              <div className="p-3.5 rounded bg-[#ffdad6]/40 border border-[#e2bebc] text-xs text-[#93000a] space-y-2">
                <p>Verify your email address before submitting an order.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resendVerification()}
                    className="underline font-semibold"
                  >
                    Resend link
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshUserSession()}
                    className="underline font-semibold"
                  >
                    Refresh status
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Wanjiku Kamau"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                  Kenyan M-Pesa / Contact Number
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+254712345678 or 0712345678"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5a403f] mb-1">Town / County</label>
                  <select
                    value={deliveryTown}
                    onChange={(e) => setDeliveryTown(e.target.value)}
                    className="w-full h-12 px-3 border border-[#e5e7eb] rounded text-sm bg-white focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                  >
                    {KENYAN_TOWNS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                    Street / Estate
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Kilimani, Apt / Road"
                    className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                  Delivery Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate instructions or preferred delivery window"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-[#202020]">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa_stk')}
                  className={`min-h-[48px] px-3 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'mpesa_stk'
                      ? 'border-[#00a859] bg-[#e8fbf0] text-[#006d38]'
                      : 'border-[#e5e7eb] bg-white text-[#202020]'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>M-Pesa STK Push</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pay_on_delivery')}
                  className={`min-h-[48px] px-3 rounded border text-xs font-semibold flex items-center justify-center ${
                    paymentMethod === 'pay_on_delivery'
                      ? 'border-[#a81825] bg-[#ffdad7]/30 text-[#a81825]'
                      : 'border-[#e5e7eb] bg-white text-[#202020]'
                  }`}
                >
                  Pay on Delivery
                </button>
              </div>
              {paymentMethod === 'mpesa_stk' && !serverConfig.mpesaConfigured && (
                <p className="text-[11px] text-[#5a403f] leading-snug">
                  Daraja sandbox/live keys are not configured on the server yet; submitting saves your order as Awaiting Payment.
                </p>
              )}
            </div>

            {/* Promo Code */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-[#5a403f]">
                Promo Code (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. STYLAH10)"
                  className="flex-1 h-11 px-3 border border-[#e5e7eb] rounded text-xs uppercase focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="min-h-[44px] px-4 rounded border border-[#e5e7eb] text-xs font-semibold text-[#202020] hover:bg-[#f8f9fa]"
                >
                  Apply
                </button>
              </div>
              {promoFeedback && (
                <p className={`text-xs ${appliedPromoCode ? 'text-[#00a859]' : 'text-[#ba1a1a]'}`}>
                  {promoFeedback}
                </p>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-[#e5e7eb] pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#5a403f]">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatKsh(cartSubtotalKsh)}</span>
              </div>
              {discountKsh > 0 && (
                <div className="flex justify-between text-[#00a859] font-medium">
                  <span>Promo ({appliedPromoCode})</span>
                  <span className="tabular-nums">-{formatKsh(discountKsh)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#5a403f]">
                <span>Delivery ({deliveryTown})</span>
                <span className="tabular-nums">
                  {deliveryFeeKsh === 0 ? 'Free' : formatKsh(deliveryFeeKsh)}
                </span>
              </div>
              <div className="flex justify-between font-display text-lg font-bold text-[#202020] pt-2 border-t border-[#f0eded]">
                <span>Total</span>
                <span className="tabular-nums">{formatKsh(grandTotalKsh)}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-[#ffdad6]/50 text-[#93000a] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !user}
              className={`w-full min-h-[48px] rounded text-white text-sm font-semibold transition-colors disabled:opacity-50 ${
                paymentMethod === 'mpesa_stk'
                  ? 'bg-[#00a859] hover:bg-[#008e4b]'
                  : 'bg-[#a81825] hover:bg-[#820014]'
              }`}
            >
              {submitting
                ? 'Validating & Submitting Order...'
                : paymentMethod === 'mpesa_stk'
                ? `Pay via M-Pesa · ${formatKsh(grandTotalKsh)}`
                : `Confirm Order · ${formatKsh(grandTotalKsh)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
