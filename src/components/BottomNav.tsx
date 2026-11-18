import { Home, ShoppingBag, Store, User, Wrench } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AppTab } from '../types/stylah';

interface BottomNavProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
}

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  const { cartCount } = useStore();

  const tabs: Array<{ id: AppTab; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shop', label: 'Shop', icon: Store },
    { id: 'cart', label: 'Cart', icon: ShoppingBag },
    { id: 'services', label: 'Services', icon: Wrench },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[72px] bg-white border-t border-[#e5e7eb] shadow-level-3 grid grid-cols-5 items-center"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`relative min-h-[48px] min-w-[48px] h-full flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-[#a81825]' : 'text-[#6b7280]'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
              {tab.id === 'cart' && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#a81825] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
