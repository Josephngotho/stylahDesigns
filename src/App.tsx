import { Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { DevicePreviewStudio } from './components/DevicePreviewStudio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppTab, Product } from './types/stylah';
import { AccountView } from './views/AccountView';
import { AdminView } from './views/AdminView';
import { CartCheckoutView } from './views/CartCheckoutView';
import { HomeView } from './views/HomeView';
import { PortfolioView } from './views/PortfolioView';
import { ProductDetailView } from './views/ProductDetailView';
import { ServicesView } from './views/ServicesView';
import { ShopView } from './views/ShopView';

function isRunningStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isInsideDeviceFrame(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('deviceFrame') === '1';
}

function isPreviewStudioPath(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/+$/, '');
  const params = new URLSearchParams(window.location.search);
  return (path === '/preview' || path === '/demo' || params.get('preview') === '1') && !isInsideDeviceFrame();
}

function DevPreviewLauncher() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || isRunningStandalonePwa() || isInsideDeviceFrame()) {
    return null;
  }

  return (
    <div className="hidden lg:flex fixed bottom-5 left-5 z-40 items-center rounded-full bg-[#202020] text-white border border-[#3a3232] shadow-level-2 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          window.location.href = '/preview';
        }}
        className="h-10 pl-3.5 pr-3 text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#333333] transition-colors"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#f26c76]" />
        <span>Pixel Demo Frame</span>
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hide demo frame launcher"
        className="h-10 px-2.5 border-l border-white/10 hover:bg-[#333333] transition-colors"
      >
        <X className="w-3.5 h-3.5 opacity-75" />
      </button>
    </div>
  );
}

function AppShell() {
  const { firestoreOffline, recheckConnection } = useAuth();
  const { settings } = useStore();
  const [retryingConn, setRetryingConn] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleNavigate = (tab: AppTab) => {
    setSelectedProduct(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showAnnouncement =
    !bannerDismissed && settings.announcementActive && Boolean(settings.announcementText?.trim());

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#202020] pb-[76px] md:pb-0 transition-colors">
      <Navbar activeTab={activeTab} onNavigate={handleNavigate} />

      {showAnnouncement && (
        <div className="bg-[#a81825] text-white text-xs px-4 py-2 flex items-center justify-center gap-3">
          <span className="font-medium text-center">{settings.announcementText}</span>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setBannerDismissed(true)}
            className="p-0.5 rounded hover:bg-white/15 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {firestoreOffline && (
        <div className="bg-[#ffdad6] text-[#93000a] text-xs px-4 py-2 text-center font-medium flex flex-wrap items-center justify-center gap-3">
          <span>Firestore appears offline. Verify your network connection or Firebase configuration.</span>
          <button
            type="button"
            disabled={retryingConn}
            onClick={async () => {
              setRetryingConn(true);
              await recheckConnection();
              setRetryingConn(false);
            }}
            className="px-2.5 py-1 rounded bg-[#93000a] text-white text-[11px] font-semibold hover:bg-[#a81825] disabled:opacity-60"
          >
            {retryingConn ? 'Checking...' : 'Retry Connection'}
          </button>
        </div>
      )}

      <main className="flex-1">
        {selectedProduct ? (
          <ProductDetailView
            product={selectedProduct}
            onBack={() => setSelectedProduct(null)}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
          />
        ) : activeTab === 'home' ? (
          <HomeView onNavigate={handleNavigate} onSelectProduct={handleSelectProduct} />
        ) : activeTab === 'shop' ? (
          <ShopView onSelectProduct={handleSelectProduct} onNavigate={handleNavigate} />
        ) : activeTab === 'cart' ? (
          <CartCheckoutView onNavigate={handleNavigate} />
        ) : activeTab === 'services' ? (
          <ServicesView onNavigate={handleNavigate} />
        ) : activeTab === 'portfolio' ? (
          <PortfolioView onNavigate={handleNavigate} />
        ) : activeTab === 'admin' ? (
          <AdminView />
        ) : (
          <AccountView onNavigate={handleNavigate} />
        )}
      </main>

      {activeTab !== 'admin' && <FloatingWhatsApp />}
      <OfflineIndicator />
      {import.meta.env.DEV && <DevPreviewLauncher />}
      <BottomNav activeTab={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  if (isPreviewStudioPath() && !isRunningStandalonePwa()) {
    return (
      <ErrorBoundary>
        <DevicePreviewStudio />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <AppShell />
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
