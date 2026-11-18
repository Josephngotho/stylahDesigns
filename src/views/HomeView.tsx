import { ArrowRight, Mail, MapPin, MessageCircle, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { applySeoMeta } from '../lib/seo';
import { HERO_IMAGE_PATH } from '../lib/seedData';
import { buildWhatsAppLink } from '../lib/whatsapp';
import { AppTab, BRAND_NAME, BRAND_TAGLINE, formatKsh, Product } from '../types/stylah';
import { ProductCard } from '../components/ProductCard';
import { SmartImage } from '../components/SmartImage';
import {
  ensureSafeSocialUrl,
  FacebookSvg,
  InstagramSvg,
  TikTokSvg,
} from '../components/SocialIcons';

interface HomeViewProps {
  onNavigate: (tab: AppTab) => void;
  onSelectProduct: (product: Product) => void;
}

export function HomeView({ onNavigate, onSelectProduct }: HomeViewProps) {
  const { isAdmin } = useAuth();
  const {
    products,
    services,
    projects,
    settings,
    effectiveWhatsappNumber,
    effectiveSupportEmail,
    effectiveLogoUrl,
    catalogLoading,
  } = useStore();

  const brandTitle = settings.businessName || BRAND_NAME;
  const tagline = settings.tagline || BRAND_TAGLINE;
  const heroKicker = settings.heroKicker || `${brandTitle} · Kenya`;
  const heroHeadline =
    settings.heroHeadline || 'Architectural Wallpapers, Chandeliers & Smart Security';
  const heroSubtitle =
    settings.heroSubtitle ||
    `${tagline} Curated wall murals, luxury interior lighting, and 4K CCTV surveillance systems supplied across Kenya with certified on-site installation.`;
  const heroImage = settings.heroImageUrl || HERO_IMAGE_PATH;
  const heroPrimaryCta = settings.heroPrimaryCta || 'Shop Products';
  const heroSecondaryCta = settings.heroSecondaryCta || 'Book Installation';

  useEffect(() => {
    applySeoMeta({
      title: `${brandTitle} – Wallpapers, Lighting & CCTV Kenya`,
      description: `${tagline} Shop architectural wallpapers, wall murals, chandeliers, and 4K CCTV systems in Kenya, or book certified interior installation services.`,
      path: '/',
    });
  }, [brandTitle, tagline]);

  const featuredProducts = (products.filter((p) => p.featured).length > 0
    ? products.filter((p) => p.featured)
    : products
  ).slice(0, 4);

  const featuredServices = services.slice(0, 3);
  const featuredProjects = projects.slice(0, 2);

  const whatsappUrl = buildWhatsAppLink(
    effectiveWhatsappNumber,
    `Hello ${brandTitle}, I would like a consultation on interior finishes or technical installation.`
  );
  const facebookHref = ensureSafeSocialUrl(settings.facebookUrl);
  const instagramHref = ensureSafeSocialUrl(settings.instagramUrl);
  const tiktokHref = ensureSafeSocialUrl(settings.tiktokUrl);

  return (
    <div className="space-y-12 pb-12">
      {/* Section 1: Architectural Hero (Customizable via Admin Storefront Customizer) */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-5 md:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-level-1">
          <div className="lg:col-span-6 p-6 md:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide text-[#a81825]">
                {heroKicker}
              </p>
              <h1 className="font-display text-3xl md:text-[38px] font-semibold leading-[1.15] tracking-tight text-[#202020] [text-wrap:balance]">
                {heroHeadline}
              </h1>
              <p className="text-sm md:text-base text-[#5a403f] leading-relaxed max-w-xl">
                {heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="min-h-[48px] px-6 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>{heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="min-h-[48px] px-5 rounded border border-[#e5e7eb] text-[#202020] text-sm font-semibold hover:bg-[#f8f9fa] transition-colors whitespace-nowrap shrink-0"
              >
                {heroSecondaryCta}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 min-h-[240px] lg:min-h-[380px] bg-[#f8f9fa]">
            <SmartImage
              src={heroImage}
              alt={`${brandTitle} architectural interior showcase`}
              fallbackTitle={brandTitle}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Featured Products */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-[#e5e7eb] pb-3">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[#202020]">
              Featured Finishes &amp; Tech
            </h2>
            <p className="text-xs md:text-sm text-[#5a403f] mt-0.5">
              Priced in Kenyan Shillings (KSh) · Live Firestore catalogue
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="min-h-[44px] px-3 text-sm font-semibold text-[#a81825] hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            <span>Browse all</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {catalogLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-72 bg-white border border-[#e5e7eb] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-8 text-center space-y-3">
            <Sparkles className="w-6 h-6 text-[#a81825] mx-auto" />
            <h3 className="font-display text-lg font-semibold text-[#202020]">
              Storefront Catalog Ready for Publishing
            </h3>
            <p className="text-sm text-[#5a403f] max-w-md mx-auto">
              Products are loaded dynamically from Cloud Firestore. Sign in with an administrator account to publish the starter catalog or upload your products.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(isAdmin ? 'admin' : 'account')}
              className="min-h-[44px] px-5 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] transition-colors"
            >
              {isAdmin ? 'Open Admin Catalog Seeder' : 'Sign In to Manage Catalog'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
                onRequireAuth={() => onNavigate('account')}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Installation & Technical Services */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-[#e5e7eb] pb-3">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[#202020]">
              Certified Installation Services
            </h2>
            <p className="text-xs md:text-sm text-[#5a403f] mt-0.5">
              Request site visits, tailored quotations, and technical execution
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="min-h-[44px] px-3 text-sm font-semibold text-[#a81825] hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            <span>Request quote</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredServices.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-lg p-6 text-sm text-[#5a403f]">
            No published services yet. Administrators can publish installation services from the Admin Console.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {featuredServices.map((svc) => (
              <article
                key={svc.id}
                onClick={() => onNavigate('services')}
                className="cursor-pointer bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-level-1 hover:shadow-level-2 transition-shadow flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#f8f9fa]">
                  <SmartImage src={svc.imageUrls[0]} alt={svc.title} fallbackTitle={svc.title} />
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-[#6b7280] mb-1">
                      {svc.category} · {svc.available ? 'Available' : 'Waitlist'}
                    </p>
                    <h3 className="font-display text-base font-semibold text-[#202020]">{svc.title}</h3>
                    <p className="text-xs text-[#5a403f] mt-1 line-clamp-2">{svc.description}</p>
                  </div>
                  <div className="pt-3 border-t border-[#f0eded] flex items-center justify-between text-xs font-semibold">
                    <span className="font-display text-sm text-[#202020] tabular-nums">
                      {svc.estimatedPriceKsh ? `From ${formatKsh(svc.estimatedPriceKsh)}` : 'Custom Quote'}
                    </span>
                    <span className="text-[#a81825] inline-flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" />
                      Book Service
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Portfolio Showcase & Brand Footer */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-[#e5e7eb] pb-3">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[#202020]">
              Portfolio Showcase
            </h2>
            <p className="text-xs md:text-sm text-[#5a403f] mt-0.5">
              Curated residential &amp; commercial spatial applications
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('portfolio')}
            className="min-h-[44px] px-3 text-sm font-semibold text-[#a81825] hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            <span>View portfolio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {featuredProjects.map((proj) => (
              <article
                key={proj.id}
                onClick={() => onNavigate('portfolio')}
                className="cursor-pointer bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-level-1 grid grid-cols-1 sm:grid-cols-2"
              >
                <div className="aspect-[4/3] sm:aspect-auto bg-[#f8f9fa]">
                  <SmartImage src={proj.imageUrls[0]} alt={proj.title} fallbackTitle={proj.title} />
                </div>
                <div className="p-4 flex flex-col justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#6b7280]">
                      {proj.category}
                      {proj.isDemo ? ' · Demonstration Showcase' : ''}
                    </p>
                    <h3 className="font-display text-base font-semibold text-[#202020] mt-1">{proj.title}</h3>
                    <p className="text-xs text-[#5a403f] mt-1.5 line-clamp-3">{proj.description}</p>
                  </div>
                  <p className="text-xs font-medium text-[#202020]">{proj.location || 'Kenya'}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Brand Footer & Direct Consultation Desk */}
        <footer className="bg-white border border-[#e5e7eb] rounded-lg p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <img
                src={effectiveLogoUrl}
                alt={brandTitle}
                className="w-14 h-14 rounded-md object-contain bg-white border border-[#e5e7eb] shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00a859]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>M-Pesa Daraja Ready · Kenyan KSh Billing</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#202020]">
                  {brandTitle}
                </h3>
                <p className="text-sm text-[#5a403f]">{tagline}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] px-5 rounded bg-[#e8fbf0] text-[#178a43] text-sm font-semibold hover:bg-[#d7f7e4] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-[#25d366]" />
                  <span>WhatsApp Desk</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="min-h-[48px] px-5 rounded bg-[#202020] text-white text-sm font-semibold hover:bg-[#333333] transition-colors whitespace-nowrap shrink-0"
              >
                Explore Catalog
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f0eded] flex flex-wrap items-center justify-between gap-4 text-xs text-[#5a403f]">
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={`mailto:${effectiveSupportEmail}`}
                className="inline-flex items-center gap-1.5 hover:text-[#a81825] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#a81825]" />
                <span>{effectiveSupportEmail}</span>
              </a>
              <span aria-hidden="true">·</span>
              <span>WhatsApp: +{effectiveWhatsappNumber.replace(/^\+/, '')}</span>
              {settings.showroomLocation && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#a81825]" />
                    {settings.showroomLocation}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(facebookHref || instagramHref || tiktokHref) && (
                <div className="flex items-center gap-2" aria-label="Social Media Channels">
                  {facebookHref && (
                    <a
                      href={facebookHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${brandTitle} on Facebook`}
                      title="Facebook"
                      className="w-9 h-9 rounded border border-[#e5e7eb] inline-flex items-center justify-center text-[#1877F2] hover:border-[#a81825] transition-colors"
                    >
                      <FacebookSvg className="w-4 h-4" />
                    </a>
                  )}
                  {instagramHref && (
                    <a
                      href={instagramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${brandTitle} on Instagram`}
                      title="Instagram"
                      className="w-9 h-9 rounded border border-[#e5e7eb] inline-flex items-center justify-center text-[#E4405F] hover:border-[#a81825] transition-colors"
                    >
                      <InstagramSvg className="w-4 h-4" />
                    </a>
                  )}
                  {tiktokHref && (
                    <a
                      href={tiktokHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${brandTitle} on TikTok`}
                      title="TikTok"
                      className="w-9 h-9 rounded border border-[#e5e7eb] inline-flex items-center justify-center text-[#202020] hover:border-[#a81825] transition-colors"
                    >
                      <TikTokSvg className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
              <span>&copy; {new Date().getFullYear()} {brandTitle}</span>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
