import { Moon, ShoppingBag, ShieldCheck, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { AppTab, BRAND_NAME } from '../types/stylah';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
}

export function Navbar({ activeTab, onNavigate }: NavbarProps) {
  const { user, isStaff } = useAuth();
  const { cartCount, unreadNotificationsCount, settings, effectiveLogoUrl } = useStore();
  const { isDark, toggleTheme } = useTheme();

  const brandTitle = settings.businessName || BRAND_NAME;

  const navLinks: Array<{ id: AppTab; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'shop', label: 'Shop' },
    { id: 'services', label: 'Services' },
    { id: 'portfolio', label: 'Portfolio' },
  ];

  if (isStaff) {
    navLinks.push({ id: 'admin', label: 'Admin' });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb]">
      {/* Desktop 3-Zone Top Bar */}
      <div className="hidden md:flex max-w-7xl mx-auto h-16 px-6 items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-lg font-bold tracking-tight text-[#202020] whitespace-nowrap shrink-0 flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[#a81825]"
        >
          <img
            src={effectiveLogoUrl}
            alt={brandTitle}
            className="w-9 h-9 rounded object-contain bg-white border border-[#e5e7eb] shrink-0"
          />
          <span>{brandTitle}</span>
        </button>

        <nav className="flex items-center gap-6" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#a81825] text-[#a81825] font-semibold'
                    : 'border-transparent text-[#5a403f] hover:text-[#202020] hover:border-[#e5e7eb]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="min-h-[42px] min-w-[42px] rounded border border-[#e5e7eb] text-[#202020] hover:bg-[#f8f9fa] transition-colors inline-flex items-center justify-center shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#f59e0b]" /> : <Moon className="w-4 h-4 text-[#5a403f]" />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="min-h-[42px] px-3.5 rounded border border-[#e5e7eb] text-sm font-medium text-[#202020] hover:bg-[#f8f9fa] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
          >
            <User className="w-4 h-4 text-[#5a403f]" />
            <span>{user ? 'Account' : 'Sign In'}</span>
            {unreadNotificationsCount > 0 && (
              <span className="text-xs font-semibold text-[#a81825] tabular-nums">
                ({unreadNotificationsCount})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="min-h-[42px] px-4 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            <span className="tabular-nums font-bold">({cartCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Header (56px) */}
      <div className="flex md:hidden h-14 px-3 items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-sm font-bold tracking-tight text-[#202020] whitespace-nowrap shrink-0 flex items-center gap-2 min-w-0"
        >
          <img
            src={effectiveLogoUrl}
            alt={brandTitle}
            className="w-8 h-8 rounded object-contain bg-white border border-[#e5e7eb] shrink-0"
          />
          <span className="truncate max-w-[140px]">{brandTitle}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded text-[#202020]"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#f59e0b]" /> : <Moon className="w-4 h-4 text-[#5a403f]" />}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('portfolio')}
            className={`min-h-[40px] px-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'portfolio' ? 'text-[#a81825]' : 'text-[#5a403f]'
            }`}
          >
            Portfolio
          </button>
          {isStaff && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              aria-label="Open Admin Dashboard"
              className={`min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded ${
                activeTab === 'admin' ? 'text-[#a81825]' : 'text-[#202020]'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
