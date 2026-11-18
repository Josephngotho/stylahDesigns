import { Calendar, CheckCircle2, ImagePlus, MessageCircle, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { SmartImage } from '../components/SmartImage';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { applySeoMeta } from '../lib/seo';
import { buildWhatsAppLink } from '../lib/whatsapp';
import { AppTab, formatKsh, normalizeKenyanPhone, ServiceItem } from '../types/stylah';

interface ServicesViewProps {
  onNavigate: (tab: AppTab) => void;
}

export function ServicesView({ onNavigate }: ServicesViewProps) {
  const { user, profile, privateInfo } = useAuth();
  const { services, effectiveWhatsappNumber, catalogLoading } = useStore();

  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [customerName, setCustomerName] = useState(profile?.fullName || user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(privateInfo?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [locationTown, setLocationTown] = useState(privateInfo?.deliveryTown || 'Nairobi');
  const [preferredDate, setPreferredDate] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successRef, setSuccessRef] = useState('');

  useEffect(() => {
    applySeoMeta({
      title: 'Wallpaper, Lighting & CCTV Installation Kenya | Stylah Designs & Interiors',
      description:
        'Book certified wallpaper installation, wall mural rigging, chandelier wiring, interior decoration, and 4K CCTV installation across Kenya.',
      path: '/services',
    });
  }, []);

  useEffect(() => {
    if (!selectedService && services.length > 0) {
      setSelectedService(services[0]);
    }
  }, [services, selectedService]);

  useEffect(() => {
    if (!customerName && (profile?.fullName || user?.displayName)) {
      setCustomerName(profile?.fullName || user?.displayName || '');
    }
    if (!phoneNumber && privateInfo?.phoneNumber) setPhoneNumber(privateInfo.phoneNumber);
    if (!email && user?.email) setEmail(user.email);
  }, [profile, privateInfo, user, customerName, phoneNumber, email]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).slice(0, 5);
    const valid = picked.filter(
      (f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 5 * 1024 * 1024
    );
    if (valid.length < picked.length) {
      setErrorMsg('Only JPG, PNG, or WEBP images under 5MB each are permitted.');
    } else {
      setErrorMsg('');
    }
    setFiles(valid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessRef('');

    if (!user) {
      onNavigate('account');
      return;
    }
    if (!user.emailVerified) {
      setErrorMsg('Please verify your email address in Account before submitting a booking.');
      return;
    }
    if (!selectedService) {
      setErrorMsg('Please select a service first.');
      return;
    }

    const normalized = normalizeKenyanPhone(phoneNumber);
    if (!normalized) {
      setErrorMsg('Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).');
      return;
    }
    if (projectDescription.trim().length < 10) {
      setErrorMsg('Please describe your space or requirements (minimum 10 characters).');
      return;
    }
    if (!preferredDate) {
      setErrorMsg('Select a preferred consultation or installation date.');
      return;
    }

    setSubmitting(true);
    try {
      const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const bookingRef = `BK-${String(Date.now()).slice(-6)}`;

      const attachmentUrls: string[] = [];
      for (const file of files) {
        const storageRef = ref(storage, `bookings/${user.uid}/${bookingId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        attachmentUrls.push(url);
      }

      try {
        await setDoc(doc(db, 'bookings', bookingId), {
          bookingRef,
          customerId: user.uid,
          customerName: customerName.trim().slice(0, 120),
          phoneNumber: normalized,
          email: email.trim().slice(0, 160),
          locationTown: locationTown.trim().slice(0, 120),
          serviceId: selectedService.id,
          serviceTitle: selectedService.title.slice(0, 140),
          projectDescription: projectDescription.trim().slice(0, 2000),
          preferredDate,
          attachmentUrls,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'notifications', `notif_${bookingId}`), {
          userId: user.uid,
          title: `Booking Request ${bookingRef}`,
          message: `We received your request for ${selectedService.title}. Our team will respond with a quotation.`,
          type: 'booking',
          read: false,
          linkPath: '/account',
          createdAt: serverTimestamp(),
        });
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.CREATE, `bookings/${bookingId}`);
      }

      const idToken = await user.getIdToken();
      if (email) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `Stylah Service Request Received (${bookingRef})`,
            text: `Hello ${customerName},\n\nYour booking request (${bookingRef}) for ${selectedService.title} in ${locationTown} on ${preferredDate} has been received.`,
          }),
        }).catch(() => undefined);
      }

      setSuccessRef(bookingRef);
      setProjectDescription('');
      setFiles([]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit service booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 pb-20">
      <div className="border-b border-[#e5e7eb] pb-4">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#202020]">
          Installation Services &amp; Quotations
        </h1>
        <p className="text-sm text-[#5a403f] mt-1">
          Book site visits, upload project photos, and track formal quotations in Kenyan Shillings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Service Cards */}
        <div className="lg:col-span-7 space-y-4">
          {catalogLoading ? (
            <div className="h-64 bg-white border border-[#e5e7eb] rounded-lg animate-pulse" />
          ) : services.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-lg p-8 text-sm text-[#5a403f]">
              No published services available yet. Administrators can publish services from the Admin Dashboard.
            </div>
          ) : (
            services.map((svc) => {
              const isSelected = selectedService?.id === svc.id;
              const waLink = buildWhatsAppLink(
                effectiveWhatsappNumber,
                `Hello Stylah, I would like a quotation for "${svc.title}".`
              );
              return (
                <article
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className={`cursor-pointer bg-white rounded-lg overflow-hidden border transition-all shadow-level-1 grid grid-cols-1 sm:grid-cols-12 ${
                    isSelected ? 'border-[#a81825] ring-1 ring-[#a81825]' : 'border-[#e5e7eb]'
                  }`}
                >
                  <div className="sm:col-span-5 aspect-[4/3] sm:aspect-auto bg-[#f8f9fa]">
                    <SmartImage src={svc.imageUrls[0]} alt={svc.title} fallbackTitle={svc.title} />
                  </div>
                  <div className="sm:col-span-7 p-4 md:p-5 space-y-3">
                    <div>
                      <p className="text-xs text-[#6b7280]">
                        {svc.category} · {svc.available ? 'Accepting Bookings' : 'Waitlist'}
                      </p>
                      <h2 className="font-display text-lg font-semibold text-[#202020] mt-0.5">
                        {svc.title}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-[#5a403f] leading-relaxed">{svc.description}</p>
                    <ul className="space-y-1 text-xs text-[#202020]">
                      {svc.benefits.slice(0, 3).map((b, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#a81825]">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-[#f0eded] flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#202020] tabular-nums">
                        {svc.estimatedPriceKsh
                          ? `From ${formatKsh(svc.estimatedPriceKsh)} ${svc.priceUnit || ''}`
                          : 'Custom Site Quotation'}
                      </span>
                      <div className="flex items-center gap-2">
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="min-h-[40px] px-3 rounded bg-[#e8fbf0] text-[#178a43] text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#25d366]" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <span className="text-xs font-semibold text-[#a81825] inline-flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5" />
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Booking & Quotation Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-[#e5e7eb] rounded-lg p-6 shadow-level-1 space-y-4 lg:sticky lg:top-20"
        >
          <div className="border-b border-[#e5e7eb] pb-3">
            <h2 className="font-display text-lg font-semibold text-[#202020]">
              Request Consultation or Quote
            </h2>
            {selectedService && (
              <p className="text-xs text-[#a81825] font-medium mt-0.5">{selectedService.title}</p>
            )}
          </div>

          {!user && (
            <div className="p-3.5 rounded bg-[#f8f9fa] border border-[#e5e7eb] text-xs text-[#5a403f] space-y-2">
              <p>Sign in to submit your consultation request and upload project photos.</p>
              <button
                type="button"
                onClick={() => onNavigate('account')}
                className="min-h-[40px] px-4 rounded bg-[#a81825] text-white font-semibold"
              >
                Sign In to Book
              </button>
            </div>
          )}

          {successRef && (
            <div className="p-4 rounded bg-[#e8fbf0] border border-[#00a859]/30 text-xs text-[#005228] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#00a859]" />
                <span>Request {successRef} Submitted</span>
              </div>
              <p>Track quotation updates anytime in your Account tab.</p>
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
                placeholder="Your full name"
                className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                  Kenyan Phone (+254 / 07)
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                  Location / Town
                </label>
                <input
                  type="text"
                  required
                  value={locationTown}
                  onChange={(e) => setLocationTown(e.target.value)}
                  placeholder="e.g. Westlands, Nairobi"
                  className="w-full h-12 px-3.5 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                  Preferred Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full h-12 pl-9 pr-3 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                Project Scope &amp; Measurements
              </label>
              <textarea
                rows={3}
                required
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder={
                  selectedService?.bookingInstructions ||
                  'Describe wall dimensions, number of rooms, camera points, or ceiling height...'
                }
                className="w-full p-3 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                Site Photos (Optional, up to 5 images, max 5MB each)
              </label>
              <label className="min-h-[48px] px-4 rounded border border-dashed border-[#8e706e] bg-[#f8f9fa] flex items-center justify-center gap-2 text-xs font-medium text-[#202020] cursor-pointer hover:bg-[#f0eded]">
                <ImagePlus className="w-4 h-4 text-[#a81825]" />
                <span>
                  {files.length > 0 ? `${files.length} image(s) selected` : 'Attach Room or Site Photos'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-[#ba1a1a]">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting || !user || !selectedService}
            className="w-full min-h-[48px] rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Uploading & Submitting...' : 'Submit Booking & Quotation Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
