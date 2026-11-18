import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { HERO_IMAGE_PATH } from '../lib/seedData';
import {
  Booking,
  BRAND_LOGO_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
  CartItem,
  Category,
  DEFAULT_SUPPORT_EMAIL,
  DEFAULT_WHATSAPP_NUMBER,
  NotificationItem,
  Order,
  PortfolioProject,
  Product,
  Promotion,
  PublicSettings,
  Quotation,
  ServiceItem,
} from '../types/stylah';
import { useAuth } from './AuthContext';

const LOCAL_CART_KEY = 'stylah_guest_cart_v1';

interface PublicServerConfig {
  mpesaConfigured: boolean;
  mpesaEnv: 'sandbox' | 'production';
  emailConfigured: boolean;
  whatsappNumber: string;
  supportEmail?: string;
}

interface StoreContextValue {
  categories: Category[];
  products: Product[];
  services: ServiceItem[];
  projects: PortfolioProject[];
  promotions: Promotion[];
  settings: PublicSettings;
  serverConfig: PublicServerConfig;
  effectiveWhatsappNumber: string;
  effectiveSupportEmail: string;
  effectiveLogoUrl: string;
  cart: CartItem[];
  cartCount: number;
  cartSubtotalKsh: number;
  favourites: string[];
  orders: Order[];
  bookings: Booking[];
  quotations: Quotation[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  catalogLoading: boolean;
  addToCart: (product: Product, quantity?: number, variant?: string) => Promise<void>;
  updateCartQty: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleFavourite: (productId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
}

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  businessName: BRAND_NAME,
  tagline: BRAND_TAGLINE,
  logoUrl: BRAND_LOGO_URL,
  announcementText: '',
  announcementActive: false,
  heroKicker: `${BRAND_NAME} · Kenya`,
  heroHeadline: 'Architectural Wallpapers, Chandeliers & Smart Security',
  heroSubtitle:
    'Transforming Walls, Elevating Spaces. Curated wall murals, luxury interior lighting, and 4K CCTV surveillance systems supplied across Kenya with certified on-site installation.',
  heroImageUrl: HERO_IMAGE_PATH,
  heroPrimaryCta: 'Shop Products',
  heroSecondaryCta: 'Book Installation',
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  supportEmail: DEFAULT_SUPPORT_EMAIL,
  showroomLocation: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  standardDeliveryFeeKsh: 650,
  freeDeliveryThresholdKsh: 25000,
};

const StoreContext = createContext<StoreContextValue | null>(null);

function cartDocId(productId: string, variant?: string): string {
  const safeVariant = (variant || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  return `${productId}__${safeVariant}`.slice(0, 128);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, isStaff } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [serverConfig, setServerConfig] = useState<PublicServerConfig>({
    mpesaConfigured: false,
    mpesaEnv: 'sandbox',
    emailConfigured: false,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    supportEmail: DEFAULT_SUPPORT_EMAIL,
  });
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [favourites, setFavourites] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Fetch public server capability flags
  useEffect(() => {
    fetch('/api/config/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setServerConfig(data);
      })
      .catch(() => undefined);
  }, []);

  // Public Catalog Listeners (Published for visitors, all docs for staff/admin)
  useEffect(() => {
    const catQuery = isStaff
      ? query(collection(db, 'categories'), orderBy('sortOrder', 'asc'))
      : query(collection(db, 'categories'), where('published', '==', true));

    const prodQuery = isStaff
      ? query(collection(db, 'products'))
      : query(collection(db, 'products'), where('published', '==', true));

    const svcQuery = isStaff
      ? query(collection(db, 'services'))
      : query(collection(db, 'services'), where('published', '==', true));

    const projQuery = isStaff
      ? query(collection(db, 'projects'))
      : query(collection(db, 'projects'), where('published', '==', true));

    const promoQuery = isStaff
      ? query(collection(db, 'promotions'))
      : query(collection(db, 'promotions'), where('published', '==', true));

    let loaded = 0;
    const markDone = () => {
      loaded += 1;
      if (loaded >= 4) setCatalogLoading(false);
    };

    const unsubCats = onSnapshot(
      catQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ ...(d.data() as Category), id: d.id }))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setCategories(list);
        markDone();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const unsubProds = onSnapshot(
      prodQuery,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id })));
        markDone();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubSvcs = onSnapshot(
      svcQuery,
      (snap) => {
        setServices(snap.docs.map((d) => ({ ...(d.data() as ServiceItem), id: d.id })));
        markDone();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'services')
    );

    const unsubProjs = onSnapshot(
      projQuery,
      (snap) => {
        setProjects(snap.docs.map((d) => ({ ...(d.data() as PortfolioProject), id: d.id })));
        markDone();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    const unsubPromos = onSnapshot(
      promoQuery,
      (snap) => {
        setPromotions(snap.docs.map((d) => ({ ...(d.data() as Promotion), id: d.id })));
      },
      () => undefined
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'public'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PublicSettings>;
          setSettings({
            ...DEFAULT_PUBLIC_SETTINGS,
            ...data,
            businessName: data.businessName || DEFAULT_PUBLIC_SETTINGS.businessName,
            whatsappNumber: data.whatsappNumber || DEFAULT_PUBLIC_SETTINGS.whatsappNumber,
            supportEmail: data.supportEmail || DEFAULT_PUBLIC_SETTINGS.supportEmail,
            logoUrl: data.logoUrl || DEFAULT_PUBLIC_SETTINGS.logoUrl,
            heroImageUrl: data.heroImageUrl || DEFAULT_PUBLIC_SETTINGS.heroImageUrl,
          });
        }
      },
      () => undefined
    );

    return () => {
      unsubCats();
      unsubProds();
      unsubSvcs();
      unsubProjs();
      unsubPromos();
      unsubSettings();
    };
  }, [isStaff]);

  // Authenticated User Listeners
  useEffect(() => {
    if (!user) {
      setFavourites([]);
      setOrders([]);
      setBookings([]);
      setQuotations([]);
      setNotifications([]);
      return;
    }

    const uid = user.uid;

    try {
      const rawGuest = localStorage.getItem(LOCAL_CART_KEY);
      if (rawGuest) {
        const guestItems = JSON.parse(rawGuest) as CartItem[];
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          guestItems.forEach((item) => {
            const id = cartDocId(item.productId, item.variant);
            setDoc(
              doc(db, 'users', uid, 'cart', id),
              {
                productId: item.productId,
                productName: item.productName,
                variant: item.variant || '',
                quantity: Math.min(100, Math.max(1, Math.round(item.quantity))),
                unitPriceKsh: item.unitPriceKsh,
                imageUrl: item.imageUrl || '',
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(() => undefined);
          });
          localStorage.removeItem(LOCAL_CART_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }

    const unsubCart = onSnapshot(
      collection(db, 'users', uid, 'cart'),
      (snap) => {
        setCart(snap.docs.map((d) => d.data() as CartItem));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/cart`)
    );

    const unsubFavs = onSnapshot(
      collection(db, 'users', uid, 'favourites'),
      (snap) => {
        setFavourites(snap.docs.map((d) => d.id));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/favourites`)
    );

    const ordersQuery = isStaff
      ? query(collection(db, 'orders'))
      : query(collection(db, 'orders'), where('customerId', '==', uid));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const bookingsQuery = isStaff
      ? query(collection(db, 'bookings'))
      : query(collection(db, 'bookings'), where('customerId', '==', uid));
    const unsubBookings = onSnapshot(
      bookingsQuery,
      (snap) => {
        setBookings(snap.docs.map((d) => ({ ...(d.data() as Booking), id: d.id })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const quotationsQuery = isStaff
      ? query(collection(db, 'quotations'))
      : query(collection(db, 'quotations'), where('customerId', '==', uid));
    const unsubQuotations = onSnapshot(
      quotationsQuery,
      (snap) => {
        setQuotations(snap.docs.map((d) => ({ ...(d.data() as Quotation), id: d.id })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
    );

    const notifQuery = query(collection(db, 'notifications'), where('userId', '==', uid));
    const unsubNotifs = onSnapshot(
      notifQuery,
      (snap) => {
        setNotifications(snap.docs.map((d) => ({ ...(d.data() as NotificationItem), id: d.id })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => {
      unsubCart();
      unsubFavs();
      unsubOrders();
      unsubBookings();
      unsubQuotations();
      unsubNotifs();
    };
  }, [user, isStaff]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
      } catch {
        // Ignore quota errors
      }
    }
  }, [cart, user]);

  const addToCart = async (product: Product, quantity = 1, variant?: string) => {
    const unitPriceKsh =
      product.discountedPriceKsh && product.discountedPriceKsh > 0 && product.discountedPriceKsh < product.priceKsh
        ? product.discountedPriceKsh
        : product.priceKsh;
    const chosenVariant = variant || product.variations?.[0] || '';
    const qtyToAdd = Math.max(1, Math.min(100, Math.round(quantity)));

    if (!user) {
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.productId === product.id && (i.variant || '') === chosenVariant);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: Math.min(100, next[idx].quantity + qtyToAdd) };
          return next;
        }
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            variant: chosenVariant,
            quantity: qtyToAdd,
            unitPriceKsh,
            imageUrl: product.imageUrls[0] || '',
          },
        ];
      });
      return;
    }

    const id = cartDocId(product.id, chosenVariant);
    const existing = cart.find((i) => i.productId === product.id && (i.variant || '') === chosenVariant);
    const nextQty = Math.min(100, (existing?.quantity || 0) + qtyToAdd);
    try {
      await setDoc(doc(db, 'users', user.uid, 'cart', id), {
        productId: product.id,
        productName: product.name,
        variant: chosenVariant,
        quantity: nextQty,
        unitPriceKsh,
        imageUrl: product.imageUrls[0] || '',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/cart/${id}`);
    }
  };

  const updateCartQty = async (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(cartKey);
      return;
    }
    const clamped = Math.min(100, Math.max(1, Math.round(quantity)));
    if (!user) {
      setCart((prev) =>
        prev.map((item) => (cartDocId(item.productId, item.variant) === cartKey ? { ...item, quantity: clamped } : item))
      );
      return;
    }
    const item = cart.find((i) => cartDocId(i.productId, i.variant) === cartKey);
    if (!item) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'cart', cartKey), {
        productId: item.productId,
        productName: item.productName,
        variant: item.variant || '',
        quantity: clamped,
        unitPriceKsh: item.unitPriceKsh,
        imageUrl: item.imageUrl || '',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/cart/${cartKey}`);
    }
  };

  const removeFromCart = async (cartKey: string) => {
    if (!user) {
      setCart((prev) => prev.filter((item) => cartDocId(item.productId, item.variant) !== cartKey));
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'cart', cartKey));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/cart/${cartKey}`);
    }
  };

  const clearCart = async () => {
    if (!user) {
      setCart([]);
      return;
    }
    try {
      await Promise.all(
        cart.map((item) => deleteDoc(doc(db, 'users', user.uid, 'cart', cartDocId(item.productId, item.variant))))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/cart`);
    }
  };

  const toggleFavourite = async (productId: string) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'favourites', productId);
    try {
      if (favourites.includes(productId)) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { productId, createdAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/favourites/${productId}`);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!user) return;
    const item = notifications.find((n) => n.id === notificationId);
    if (!item) return;
    try {
      await setDoc(
        doc(db, 'notifications', notificationId),
        {
          userId: item.userId,
          title: item.title,
          message: item.message,
          type: item.type,
          read: true,
          linkPath: item.linkPath || '',
          createdAt: item.createdAt,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const cartSubtotalKsh = useMemo(
    () => cart.reduce((acc, item) => acc + item.unitPriceKsh * item.quantity, 0),
    [cart]
  );
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const effectiveWhatsappNumber =
    settings.whatsappNumber || serverConfig.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const effectiveSupportEmail =
    settings.supportEmail || serverConfig.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const effectiveLogoUrl = settings.logoUrl || BRAND_LOGO_URL;

  return (
    <StoreContext.Provider
      value={{
        categories,
        products,
        services,
        projects,
        promotions,
        settings,
        serverConfig,
        effectiveWhatsappNumber,
        effectiveSupportEmail,
        effectiveLogoUrl,
        cart,
        cartCount,
        cartSubtotalKsh,
        favourites,
        orders,
        bookings,
        quotations,
        notifications,
        unreadNotificationsCount,
        catalogLoading,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        toggleFavourite,
        markNotificationRead,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export { cartDocId };
