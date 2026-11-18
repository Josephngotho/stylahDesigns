import {
  Bell,
  CheckCircle2,
  Heart,
  LogOut,
  MailWarning,
  Package,
  ShieldCheck,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { applySeoMeta } from '../lib/seo';
import { AppTab, BRAND_NAME, formatKsh, formatTimestamp, normalizeKenyanPhone } from '../types/stylah';

interface AccountViewProps {
  onNavigate: (tab: AppTab) => void;
}

export function AccountView({ onNavigate }: AccountViewProps) {
  const {
    user,
    profile,
    privateInfo,
    role,
    isStaff,
    loading,
    signInWithGoogle,
    registerWithEmail,
    loginWithEmail,
    sendResetEmail,
    resendVerification,
    refreshUserSession,
    logout,
    savePrivateInfo,
  } = useAuth();
  const {
    products,
    favourites,
    orders,
    bookings,
    quotations,
    notifications,
    markNotificationRead,
    settings,
    effectiveLogoUrl,
  } = useStore();

  const brandTitle = settings.businessName || BRAND_NAME;

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authFeedback, setAuthFeedback] = useState('');
  const [authError, setAuthError] = useState('');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTown, setEditTown] = useState('Nairobi');
  const [editAddress, setEditAddress] = useState('');
  const [profileSaved, setProfileSaved] = useState('');
  const [notifStatus, setNotifStatus] = useState<string>('');

  useEffect(() => {
    applySeoMeta({
      title: `Account, Orders & Quotations | ${brandTitle}`,
      description: `Manage your ${brandTitle} profile, Kenyan delivery address, order tracking, and service quotations.`,
      path: '/account',
    });
  }, [brandTitle]);

  useEffect(() => {
    if (profile?.fullName) setEditName(profile.fullName);
    if (privateInfo?.phoneNumber) setEditPhone(privateInfo.phoneNumber);
    if (privateInfo?.deliveryTown) setEditTown(privateInfo.deliveryTown);
    if (privateInfo?.deliveryAddress) setEditAddress(privateInfo.deliveryAddress);
  }, [profile, privateInfo]);

  const formatAuthError = (err: unknown, fallback: string): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    const codeMatch = raw.match(/\(?(auth\/[a-z0-9-]+)\)?/i);
    const codeTag = codeMatch ? ` (${codeMatch[1]})` : '';

    if (raw.includes('auth/operation-not-allowed')) {
      return `Email/Password sign-in is not enabled in Firebase Console yet. Click "Continue with Google" above, or enable Email/Password under Authentication → Sign-in method.${codeTag}`;
    }
    if (raw.includes('auth/admin-restricted-operation')) {
      return `New account sign-ups are currently restricted in Firebase Console. Enable "Create (sign-up)" under Authentication → Settings → User actions.${codeTag}`;
    }
    if (raw.includes('auth/email-already-in-use')) {
      return `An account with this email already exists. Switch to "Sign In" or click "Continue with Google" above.${codeTag}`;
    }
    if (raw.includes('auth/weak-password') || raw.includes('auth/password-does-not-meet-requirements')) {
      return `Password does not meet security requirements. Use at least 6–8 characters including uppercase, lowercase, and a number.${codeTag}`;
    }
    if (raw.includes('auth/invalid-email')) {
      return `Please enter a valid email address.${codeTag}`;
    }
    if (raw.includes('auth/account-exists-with-different-credential')) {
      return `This email is already registered with a different sign-in method. Try Email & Password sign-in or Google.${codeTag}`;
    }
    if (raw.includes('auth/popup-blocked')) {
      return `Sign-in popup was blocked by your browser. Allow popups for this site and click "Continue with Google" again.${codeTag}`;
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return `Google sign-in window was closed before completing login.${codeTag}`;
    }
    if (raw.includes('auth/cancelled-popup-request')) {
      return `Another sign-in window is already open. Please finish or close it and try again.${codeTag}`;
    }
    if (raw.includes('auth/unauthorized-domain')) {
      return `This domain (${window.location.hostname}) is not authorized in Firebase Console → Authentication → Settings → Authorized domains.${codeTag}`;
    }
    if (raw.includes('auth/network-request-failed')) {
      return `Network request to Firebase Authentication failed. Check your connection or disable any script blocker and retry.${codeTag}`;
    }
    if (
      raw.includes('auth/invalid-credential') ||
      raw.includes('auth/wrong-password') ||
      raw.includes('auth/user-not-found')
    ) {
      return `Invalid email or password. If your account uses Google, click "Continue with Google" above.${codeTag}`;
    }
    if (raw.includes('auth/too-many-requests')) {
      return `Too many attempts. Please wait a minute and try again.${codeTag}`;
    }
    return raw || fallback;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthFeedback('');
    setAuthBusy(true);
    try {
      if (showForgotPassword) {
        await sendResetEmail(emailInput);
        setAuthFeedback('Password reset link sent to your email address if an account exists.');
      } else if (authMode === 'login') {
        await loginWithEmail(emailInput, passwordInput);
      } else {
        await registerWithEmail(fullName, emailInput, passwordInput);
        setAuthFeedback('Account created! Check your inbox for the verification email.');
      }
    } catch (err) {
      setAuthError(formatAuthError(err, 'Authentication failed.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthFeedback('');
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(formatAuthError(err, 'Google Sign-In failed.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved('');
    let phoneToSave = '';
    if (editPhone.trim()) {
      const normalized = normalizeKenyanPhone(editPhone);
      if (!normalized) {
        setProfileSaved('Enter a valid Kenyan phone number (e.g. +254745280011).');
        return;
      }
      phoneToSave = normalized;
    }
    await savePrivateInfo({
      fullName: editName,
      phoneNumber: phoneToSave,
      deliveryTown: editTown,
      deliveryAddress: editAddress,
    });
    setProfileSaved('Profile & delivery address saved.');
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleRespondQuotation = async (quotationId: string, decision: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'quotations', quotationId), {
        status: decision,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `quotations/${quotationId}`);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Browser notifications are not supported on this device.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifStatus(
      perm === 'granted'
        ? 'Push notification alerts enabled for order and quotation updates.'
        : 'Notification permission was not granted.'
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-64 bg-white border border-[#e5e7eb] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 pb-20">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-6 md:p-8 shadow-level-1 space-y-5">
          <div className="flex items-center gap-3.5">
            <img
              src={effectiveLogoUrl}
              alt={brandTitle}
              className="w-14 h-14 rounded-md object-contain bg-white border border-[#e5e7eb] shrink-0"
            />
            <div>
              <h1 className="font-display text-xl font-semibold text-[#202020]">{brandTitle}</h1>
              <p className="text-xs text-[#5a403f] mt-0.5">
                Sign in to track orders, view quotations, or open Admin Console.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleLogin}
            className="w-full min-h-[48px] px-4 rounded border border-[#e5e7eb] bg-white text-sm font-semibold text-[#202020] hover:bg-[#f8f9fa] transition-colors flex items-center justify-center gap-2.5"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative text-center text-xs text-[#6b7280]">
            <span className="bg-white px-3 relative z-10">or use Email &amp; Password</span>
            <div className="absolute left-0 right-0 top-1/2 border-t border-[#e5e7eb]" />
          </div>

          {!showForgotPassword && (
            <div className="flex gap-1 p-1 bg-[#f5f5f5] rounded">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAuthMode(m);
                    setShowForgotPassword(false);
                    setAuthError('');
                    setAuthFeedback('');
                  }}
                  className={`flex-1 min-h-[40px] rounded text-xs font-semibold transition-colors ${
                    authMode === m ? 'bg-white text-[#a81825] shadow-level-1' : 'text-[#5a403f]'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {showForgotPassword && (
              <div className="flex items-center justify-between pb-1">
                <p className="text-sm font-semibold text-[#202020]">Forgot Password</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setAuthError('');
                    setAuthFeedback('');
                  }}
                  className="text-xs font-semibold text-[#a81825] hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {!showForgotPassword && authMode === 'register' && (
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
              />
            )}

            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email address"
              className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
            />

            {!showForgotPassword && (
              <div className="space-y-1.5">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
                {authMode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setAuthError('');
                        setAuthFeedback('');
                      }}
                      className="text-xs font-semibold text-[#a81825] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {authError && <p className="text-xs text-[#ba1a1a]">{authError}</p>}
            {authFeedback && <p className="text-xs text-[#00a859]">{authFeedback}</p>}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full min-h-[48px] rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] disabled:opacity-50"
            >
              {authBusy
                ? 'Please wait...'
                : showForgotPassword
                ? 'Send Password Reset Link'
                : authMode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const favouriteProducts = products.filter((p) => favourites.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 pb-20">
      {/* Account Header */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-level-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#6b7280]">
            <UserCheck className="w-4 h-4 text-[#a81825]" />
            <span className="uppercase font-semibold">{role}</span>
            <span>·</span>
            <span>{user.email}</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#202020]">
            {profile?.fullName || user.displayName || `${brandTitle} Account`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isStaff && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="min-h-[44px] px-4 rounded bg-[#202020] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Console</span>
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="min-h-[44px] px-4 rounded border border-[#e5e7eb] text-xs font-semibold text-[#202020] hover:bg-[#f8f9fa] inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Email Verification Gate */}
      {!user.emailVerified && (
        <div className="bg-[#ffdad6]/40 border border-[#e2bebc] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-[#93000a]">
            <MailWarning className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Email Verification Required for Orders, Bookings &amp; Admin Access</p>
              <p>Verify your email via the link sent to {user.email}, then click Refresh Status.</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => resendVerification()}
              className="min-h-[40px] px-3 rounded border border-[#93000a] text-[#93000a] text-xs font-semibold"
            >
              Resend Link
            </button>
            <button
              type="button"
              onClick={() => refreshUserSession()}
              className="min-h-[40px] px-3 rounded bg-[#a81825] text-white text-xs font-semibold"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile + Notifications + Favourites */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3 shadow-level-1"
          >
            <h2 className="font-display text-base font-semibold text-[#202020]">
              Profile &amp; Delivery Address
            </h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Full Name"
              className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
            />
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Kenyan Phone (+2547...)"
              className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={editTown}
                onChange={(e) => setEditTown(e.target.value)}
                placeholder="Town (e.g. Nairobi)"
                className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
              />
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Estate / Street"
                className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
              />
            </div>
            {profileSaved && <p className="text-xs text-[#00a859]">{profileSaved}</p>}
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded bg-[#a81825] text-white text-xs font-semibold hover:bg-[#820014]"
            >
              Save Details
            </button>
          </form>

          {/* Notifications & FCM Opt-in */}
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3 shadow-level-1">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#202020] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#a81825]" />
                <span>Notifications ({notifications.length})</span>
              </h2>
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className="text-xs font-semibold text-[#a81825] hover:underline"
              >
                Enable Push Alerts
              </button>
            </div>
            {notifStatus && <p className="text-xs text-[#5a403f]">{notifStatus}</p>}
            {notifications.length === 0 ? (
              <p className="text-xs text-[#6b7280]">No notifications yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markNotificationRead(n.id)}
                    className={`p-3 rounded border text-xs cursor-pointer ${
                      n.read ? 'border-[#e5e7eb] bg-white' : 'border-[#a81825]/40 bg-[#ffdad7]/15'
                    }`}
                  >
                    <p className="font-semibold text-[#202020]">{n.title}</p>
                    <p className="text-[#5a403f] mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favourites */}
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3 shadow-level-1">
            <h2 className="font-display text-base font-semibold text-[#202020] flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#a81825]" />
              <span>Saved Favourites ({favouriteProducts.length})</span>
            </h2>
            {favouriteProducts.length === 0 ? (
              <p className="text-xs text-[#6b7280]">Tap the heart icon on any product to save it here.</p>
            ) : (
              <div className="space-y-2">
                {favouriteProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs border-b border-[#f0eded] pb-2">
                    <span className="font-medium text-[#202020] truncate pr-2">{p.name}</span>
                    <span className="font-display font-bold tabular-nums shrink-0">{formatKsh(p.priceKsh)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Orders + Bookings & Quotations */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4 shadow-level-1">
            <h2 className="font-display text-lg font-semibold text-[#202020] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#a81825]" />
              <span>Order History ({orders.length})</span>
            </h2>

            {orders.length === 0 ? (
              <p className="text-sm text-[#5a403f]">You have not placed any product orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div key={ord.id} className="border border-[#e5e7eb] rounded p-4 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-[#202020]">
                        {ord.orderRef}
                      </span>
                      <span className="text-[#6b7280]">
                        {formatTimestamp(ord.createdAt)} · {ord.orderStatus.replace(/_/g, ' ')} ·{' '}
                        <strong className={ord.paymentStatus === 'paid' ? 'text-[#00a859]' : 'text-[#202020]'}>
                          {ord.paymentStatus}
                        </strong>
                      </span>
                    </div>
                    <p className="text-[#5a403f]">{ord.itemsSummary}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#f0eded]">
                      <span className="font-display text-sm font-bold text-[#202020] tabular-nums">
                        {formatKsh(ord.totalKsh)}
                      </span>
                      {(ord.orderStatus === 'pending' || ord.orderStatus === 'awaiting_payment') && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.id)}
                          className="text-xs font-semibold text-[#ba1a1a] hover:underline"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4 shadow-level-1">
            <h2 className="font-display text-lg font-semibold text-[#202020] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#a81825]" />
              <span>Service Bookings &amp; Quotations ({bookings.length})</span>
            </h2>

            {bookings.length === 0 ? (
              <p className="text-sm text-[#5a403f]">No installation bookings submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((bk) => {
                  const linkedQuote = quotations.find((q) => q.bookingId === bk.id);
                  return (
                    <div key={bk.id} className="border border-[#e5e7eb] rounded p-4 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#202020]">
                          {bk.bookingRef} · {bk.serviceTitle}
                        </span>
                        <span className="font-semibold text-[#a81825] capitalize">{bk.status}</span>
                      </div>
                      <p className="text-[#5a403f]">
                        {bk.locationTown} · Preferred: {bk.preferredDate}
                      </p>
                      <p className="text-[#5a403f]">{bk.projectDescription}</p>

                      {linkedQuote && (
                        <div className="mt-2 p-3 rounded bg-[#f8f9fa] border border-[#e5e7eb] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#202020]">
                              Quotation {linkedQuote.quotationRef}
                            </span>
                            <span className="font-display font-bold text-sm text-[#202020] tabular-nums">
                              {formatKsh(linkedQuote.estimatedTotalKsh)}
                            </span>
                          </div>
                          <p className="text-[#5a403f]">{linkedQuote.lineItemsSummary}</p>
                          {linkedQuote.status === 'sent' ? (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleRespondQuotation(linkedQuote.id, 'accepted')}
                                className="min-h-[36px] px-3 rounded bg-[#00a859] text-white font-semibold inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Accept Quote
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondQuotation(linkedQuote.id, 'declined')}
                                className="min-h-[36px] px-3 rounded border border-[#e5e7eb] text-[#202020] font-semibold"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <p className="font-semibold text-[#006d38] capitalize">
                              Quotation status: {linkedQuote.status}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
