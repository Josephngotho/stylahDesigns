import {
  Activity,
  BarChart3,
  Briefcase,
  Check,
  Database,
  FileText,
  FolderKanban,
  ImagePlus,
  Layers,
  Package,
  Palette,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { SmartImage } from '../components/SmartImage';
import { FacebookSvg, InstagramSvg, TikTokSvg } from '../components/SocialIcons';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import {
  HERO_IMAGE_PATH,
  seedStarterFirestoreData,
  SERVICE_IMAGE_PATH,
  WALLPAPER_IMAGE_PATH,
} from '../lib/seedData';
import { applySeoMeta } from '../lib/seo';
import {
  AuditLog,
  AvailabilityStatus,
  Booking,
  BookingStatus,
  BRAND_LOGO_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
  Category,
  DEFAULT_SUPPORT_EMAIL,
  DEFAULT_WHATSAPP_NUMBER,
  formatKsh,
  formatTimestamp,
  OrderStatus,
  PaymentStatus,
  PortfolioProject,
  Product,
  Promotion,
  ServiceItem,
  slugify,
  UserAccount,
  UserRole,
} from '../types/stylah';

type AdminSection =
  | 'overview'
  | 'customizer'
  | 'products'
  | 'catalog_meta'
  | 'services'
  | 'portfolio'
  | 'orders'
  | 'bookings'
  | 'customers';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export function AdminView() {
  const { user, isAdmin, isStaff } = useAuth();
  const {
    categories,
    products,
    services,
    projects,
    promotions,
    orders,
    bookings,
    quotations,
    settings,
    effectiveLogoUrl,
  } = useStore();

  const [section, setSection] = useState<AdminSection>('overview');
  const [customers, setCustomers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [busyMsg, setBusyMsg] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [savingCustomizer, setSavingCustomizer] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Storefront Customizer Form State
  const [custBusinessName, setCustBusinessName] = useState(settings.businessName || BRAND_NAME);
  const [custTagline, setCustTagline] = useState(settings.tagline || BRAND_TAGLINE);
  const [custLogoUrl, setCustLogoUrl] = useState(settings.logoUrl || BRAND_LOGO_URL);
  const [custAnnouncementActive, setCustAnnouncementActive] = useState(
    Boolean(settings.announcementActive)
  );
  const [custAnnouncementText, setCustAnnouncementText] = useState(settings.announcementText || '');
  const [custHeroKicker, setCustHeroKicker] = useState(
    settings.heroKicker || `${BRAND_NAME} · Kenya`
  );
  const [custHeroHeadline, setCustHeroHeadline] = useState(
    settings.heroHeadline || 'Architectural Wallpapers, Chandeliers & Smart Security'
  );
  const [custHeroSubtitle, setCustHeroSubtitle] = useState(settings.heroSubtitle || '');
  const [custHeroImageUrl, setCustHeroImageUrl] = useState(
    settings.heroImageUrl || HERO_IMAGE_PATH
  );
  const [custHeroPrimaryCta, setCustHeroPrimaryCta] = useState(
    settings.heroPrimaryCta || 'Shop Products'
  );
  const [custHeroSecondaryCta, setCustHeroSecondaryCta] = useState(
    settings.heroSecondaryCta || 'Book Installation'
  );
  const [custWhatsapp, setCustWhatsapp] = useState(
    settings.whatsappNumber || DEFAULT_WHATSAPP_NUMBER
  );
  const [custEmail, setCustEmail] = useState(settings.supportEmail || DEFAULT_SUPPORT_EMAIL);
  const [custLocation, setCustLocation] = useState(settings.showroomLocation || '');
  const [custFacebookUrl, setCustFacebookUrl] = useState(settings.facebookUrl || '');
  const [custInstagramUrl, setCustInstagramUrl] = useState(settings.instagramUrl || '');
  const [custTiktokUrl, setCustTiktokUrl] = useState(settings.tiktokUrl || '');
  const [custDeliveryFee, setCustDeliveryFee] = useState(String(settings.standardDeliveryFeeKsh));
  const [custFreeThreshold, setCustFreeThreshold] = useState(
    String(settings.freeDeliveryThresholdKsh)
  );

  // Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDiscountPrice, setProdDiscountPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImageUrls, setProdImageUrls] = useState<string[]>([WALLPAPER_IMAGE_PATH]);
  const [prodNewImageUrl, setProdNewImageUrl] = useState('');
  const [prodVariationsText, setProdVariationsText] = useState('Standard Specification');
  const [prodSpecsText, setProdSpecsText] = useState(
    `Supplied by ${BRAND_NAME}`
  );
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodPublished, setProdPublished] = useState(true);

  // Category Form State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'product' | 'service' | 'both'>('both');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState(WALLPAPER_IMAGE_PATH);
  const [catSortOrder, setCatSortOrder] = useState('1');
  const [catPublished, setCatPublished] = useState(true);

  // Promo Code Form State
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoPercent, setPromoPercent] = useState('10');
  const [promoPublished, setPromoPublished] = useState(true);

  // Service Form State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [svcTitle, setSvcTitle] = useState('');
  const [svcCategory, setSvcCategory] = useState('Interior Decoration');
  const [svcPrice, setSvcPrice] = useState('5000');
  const [svcPriceUnit, setSvcPriceUnit] = useState('starting estimate');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcBenefitsText, setSvcBenefitsText] = useState(
    'Certified technical execution\nTransparent KSh Bill of Quantities'
  );
  const [svcBookingNotes, setSvcBookingNotes] = useState(
    'Share room measurements and attach site photos.'
  );
  const [svcImageUrls, setSvcImageUrls] = useState<string[]>([SERVICE_IMAGE_PATH]);
  const [svcAvailable, setSvcAvailable] = useState(true);
  const [svcPublished, setSvcPublished] = useState(true);

  // Portfolio Form State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projTitle, setProjTitle] = useState('');
  const [projCategory, setProjCategory] = useState('Interior Decoration');
  const [projLocation, setProjLocation] = useState('Nairobi, Kenya');
  const [projCompletionDate, setProjCompletionDate] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projImageUrls, setProjImageUrls] = useState<string[]>([HERO_IMAGE_PATH]);
  const [projFeatured, setProjFeatured] = useState(true);
  const [projPublished, setProjPublished] = useState(true);
  const [projIsDemo, setProjIsDemo] = useState(false);

  // Quotation Composer State
  const [quoteBooking, setQuoteBooking] = useState<Booking | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteItemsText, setQuoteItemsText] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  useEffect(() => {
    applySeoMeta({
      title: `Admin Operations Console | ${BRAND_NAME}`,
      description: `Protected administration portal for ${BRAND_NAME} catalog, branding, orders, bookings, and settings.`,
      path: '/admin',
    });
  }, []);

  useEffect(() => {
    setCustBusinessName(settings.businessName || BRAND_NAME);
    setCustTagline(settings.tagline || BRAND_TAGLINE);
    setCustLogoUrl(settings.logoUrl || BRAND_LOGO_URL);
    setCustAnnouncementActive(Boolean(settings.announcementActive));
    setCustAnnouncementText(settings.announcementText || '');
    setCustHeroKicker(settings.heroKicker || `${BRAND_NAME} · Kenya`);
    setCustHeroHeadline(
      settings.heroHeadline || 'Architectural Wallpapers, Chandeliers & Smart Security'
    );
    setCustHeroSubtitle(settings.heroSubtitle || '');
    setCustHeroImageUrl(settings.heroImageUrl || HERO_IMAGE_PATH);
    setCustHeroPrimaryCta(settings.heroPrimaryCta || 'Shop Products');
    setCustHeroSecondaryCta(settings.heroSecondaryCta || 'Book Installation');
    setCustWhatsapp(settings.whatsappNumber || DEFAULT_WHATSAPP_NUMBER);
    setCustEmail(settings.supportEmail || DEFAULT_SUPPORT_EMAIL);
    setCustLocation(settings.showroomLocation || '');
    setCustFacebookUrl(settings.facebookUrl || '');
    setCustInstagramUrl(settings.instagramUrl || '');
    setCustTiktokUrl(settings.tiktokUrl || '');
    setCustDeliveryFee(String(settings.standardDeliveryFeeKsh));
    setCustFreeThreshold(String(settings.freeDeliveryThresholdKsh));
  }, [settings]);

  useEffect(() => {
    if (!prodCategoryId && categories.length > 0) {
      setProdCategoryId(categories[0].id);
    }
  }, [categories, prodCategoryId]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setCustomers(snap.docs.map((d) => d.data() as UserAccount));
      },
      () => undefined
    );
    const unsubLogs = onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAuditLogs(snap.docs.slice(0, 30).map((d) => ({ ...(d.data() as AuditLog), id: d.id })));
      },
      () => undefined
    );
    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [isAdmin]);

  if (!user || !isStaff) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-8 text-center space-y-3 shadow-level-1">
          <ShieldAlert className="w-8 h-8 text-[#ba1a1a] mx-auto" />
          <h1 className="font-display text-xl font-semibold text-[#202020]">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[#5a403f]">
            This workspace is protected by verified role authorization and Firestore security rules. Sign in with an authorized administrator or staff account.
          </p>
        </div>
      </div>
    );
  }

  const notifySuccess = (msg: string) => {
    setErrorBanner('');
    setBusyMsg(msg);
    setTimeout(() => setBusyMsg(''), 4500);
  };

  const notifyError = (msg: string) => {
    setBusyMsg('');
    setErrorBanner(msg);
  };

  const writeAudit = async (
    action: string,
    targetCollection: string,
    targetId: string,
    summary: string
  ) => {
    try {
      await setDoc(
        doc(db, 'auditLogs', `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
        {
          actorId: user.uid,
          actorEmail: user.email || '',
          action,
          targetCollection,
          targetId,
          summary: summary.slice(0, 400),
          createdAt: serverTimestamp(),
        }
      );
    } catch {
      // Non-fatal
    }
  };

  const uploadImagesToStorage = async (
    files: FileList | null,
    folder: string,
    key: string
  ): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    const list = Array.from(files);
    for (const file of list) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        notifyError('Only JPG, PNG, WEBP, or AVIF images are permitted.');
        return [];
      }
      if (file.size > MAX_IMAGE_BYTES) {
        notifyError(`"${file.name}" exceeds the 5MB upload limit.`);
        return [];
      }
    }

    setUploadingKey(key);
    setErrorBanner('');
    try {
      const urls: string[] = [];
      for (const file of list) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `catalog/${folder}/${Date.now()}_${cleanName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      notifySuccess(`Uploaded ${urls.length} image(s) to Firebase Storage.`);
      return urls;
    } catch (err) {
      notifyError(
        err instanceof Error
          ? err.message
          : 'Upload failed. Confirm Firebase Storage is enabled and your email is verified.'
      );
      return [];
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSeedCatalog = async () => {
    setBusyMsg('Publishing starter catalog...');
    try {
      await seedStarterFirestoreData(user.uid, user.email || '');
      notifySuccess('Starter categories, products, services, promo code, and demo portfolio published.');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to publish starter catalog.');
    }
  };

  // --- Storefront Customizer & Settings ---
  const handleSaveCustomizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || savingCustomizer) return;
    setSavingCustomizer(true);
    setErrorBanner('');
    setBusyMsg('Publishing storefront changes...');
    try {
      await setDoc(doc(db, 'settings', 'public'), {
        businessName: custBusinessName.trim().slice(0, 120) || BRAND_NAME,
        tagline: custTagline.trim().slice(0, 160),
        logoUrl: custLogoUrl.trim().slice(0, 500) || BRAND_LOGO_URL,
        announcementText: custAnnouncementText.trim().slice(0, 200),
        announcementActive: custAnnouncementActive,
        heroKicker: custHeroKicker.trim().slice(0, 100),
        heroHeadline: custHeroHeadline.trim().slice(0, 160),
        heroSubtitle: custHeroSubtitle.trim().slice(0, 400),
        heroImageUrl: custHeroImageUrl.trim().slice(0, 500) || HERO_IMAGE_PATH,
        heroPrimaryCta: custHeroPrimaryCta.trim().slice(0, 60) || 'Shop Products',
        heroSecondaryCta: custHeroSecondaryCta.trim().slice(0, 60) || 'Book Installation',
        whatsappNumber: custWhatsapp.trim().slice(0, 20) || DEFAULT_WHATSAPP_NUMBER,
        supportEmail: custEmail.trim().slice(0, 160) || DEFAULT_SUPPORT_EMAIL,
        showroomLocation: custLocation.trim().slice(0, 200),
        facebookUrl: custFacebookUrl.trim().slice(0, 500),
        instagramUrl: custInstagramUrl.trim().slice(0, 500),
        tiktokUrl: custTiktokUrl.trim().slice(0, 500),
        standardDeliveryFeeKsh: Math.max(0, Number(custDeliveryFee) || 0),
        freeDeliveryThresholdKsh: Math.max(0, Number(custFreeThreshold) || 0),
        updatedAt: serverTimestamp(),
      });
      await writeAudit(
        'UPDATE_STOREFRONT_CUSTOMIZER',
        'settings',
        'public',
        'Updated storefront branding, logo, hero banner, social links, announcement bar, and delivery configuration.'
      );
      notifySuccess('Storefront branding, social links & settings saved live.');
    } catch (err) {
      console.error('Storefront publish failed:', err);
      notifyError('Storefront changes could not be published. Check your connection and administrator access, then try again.');
    } finally {
      setSavingCustomizer(false);
    }
  };

  // --- Products CRUD ---
  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdPrice('');
    setProdDiscountPrice('');
    setProdStock('10');
    setProdDesc('');
    setProdImageUrls([WALLPAPER_IMAGE_PATH]);
    setProdNewImageUrl('');
    setProdVariationsText('Standard Specification');
    setProdSpecsText(`Supplied by ${BRAND_NAME}`);
    setProdFeatured(false);
    setProdPublished(true);
  };

  const handleUploadProductImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadImagesToStorage(e.target.files, 'products', 'product');
    if (urls.length > 0) {
      setProdImageUrls((prev) => {
        const cleaned = prev.filter((u) => u !== WALLPAPER_IMAGE_PATH || prev.length > 1);
        return Array.from(new Set([...cleaned, ...urls])).slice(0, 8);
      });
    }
    e.target.value = '';
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const cat = categories.find((c) => c.id === prodCategoryId) || categories[0];
    const id = editingProductId || `prod_${slugify(prodName)}_${Date.now().toString().slice(-4)}`;
    const priceNum = Math.max(1, Number(prodPrice) || 1000);
    const discNum = prodDiscountPrice ? Number(prodDiscountPrice) : undefined;
    const stockNum = Math.max(0, Math.round(Number(prodStock) || 0));
    const status: AvailabilityStatus =
      stockNum === 0 ? 'out_of_stock' : stockNum <= 8 ? 'low_stock' : 'in_stock';
    const images = prodImageUrls.filter(Boolean).slice(0, 8);
    const variations = prodVariationsText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 15);
    const specifications = prodSpecsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    try {
      const existing = products.find((p) => p.id === id);
      const payload: Record<string, unknown> = {
        id,
        name: prodName.trim().slice(0, 140),
        slug: slugify(prodName) || id,
        description:
          prodDesc.trim().slice(0, 3000) || `Architectural finish supplied by ${BRAND_NAME}.`,
        categoryId: cat?.id || 'cat_general',
        categoryName: cat?.name || 'General',
        priceKsh: priceNum,
        stockQty: stockNum,
        availabilityStatus: status,
        featured: prodFeatured,
        published: prodPublished,
        imageUrls: images.length > 0 ? images : [WALLPAPER_IMAGE_PATH],
        variations: variations.length > 0 ? variations : ['Standard Specification'],
        specifications: specifications.length > 0 ? specifications : [`Supplied by ${BRAND_NAME}`],
        searchKeywords: [
          prodName.trim().toLowerCase(),
          (cat?.name || '').toLowerCase(),
          'kenya',
        ].filter(Boolean),
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (discNum && discNum > 0 && discNum < priceNum) {
        payload.discountedPriceKsh = discNum;
      }

      await setDoc(doc(db, 'products', id), payload);
      await writeAudit(
        editingProductId ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
        'products',
        id,
        `${editingProductId ? 'Updated' : 'Created'} product ${prodName} (${formatKsh(priceNum)})`
      );
      resetProductForm();
      notifySuccess('Product saved to Cloud Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCategoryId(p.categoryId);
    setProdPrice(String(p.priceKsh));
    setProdDiscountPrice(p.discountedPriceKsh ? String(p.discountedPriceKsh) : '');
    setProdStock(String(p.stockQty));
    setProdDesc(p.description);
    setProdImageUrls(p.imageUrls.length > 0 ? p.imageUrls : [WALLPAPER_IMAGE_PATH]);
    setProdVariationsText((p.variations || ['Standard Specification']).join(', '));
    setProdSpecsText((p.specifications || []).join('\n'));
    setProdFeatured(p.featured);
    setProdPublished(p.published);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      await writeAudit('DELETE_PRODUCT', 'products', id, `Deleted product ${name}`);
      if (editingProductId === id) resetProductForm();
      notifySuccess(`Deleted "${name}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // --- Categories CRUD ---
  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatType('both');
    setCatDesc('');
    setCatImageUrl(WALLPAPER_IMAGE_PATH);
    setCatSortOrder(String(categories.length + 1));
    setCatPublished(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const id = editingCategoryId || `cat_${slugify(catName) || Date.now().toString().slice(-5)}`;
    const existing = categories.find((c) => c.id === id);
    try {
      await setDoc(doc(db, 'categories', id), {
        id,
        name: catName.trim().slice(0, 80),
        slug: slugify(catName) || id,
        type: catType,
        description: catDesc.trim().slice(0, 400),
        imageUrl: catImageUrl.trim().slice(0, 500) || WALLPAPER_IMAGE_PATH,
        sortOrder: Math.max(0, Math.min(1000, Number(catSortOrder) || 1)),
        published: catPublished,
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAudit(
        editingCategoryId ? 'UPDATE_CATEGORY' : 'CREATE_CATEGORY',
        'categories',
        id,
        `${editingCategoryId ? 'Updated' : 'Created'} category ${catName}`
      );
      resetCategoryForm();
      notifySuccess('Category saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatDesc(cat.description || '');
    setCatImageUrl(cat.imageUrl || WALLPAPER_IMAGE_PATH);
    setCatSortOrder(String(cat.sortOrder ?? 1));
    setCatPublished(cat.published);
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      await writeAudit('DELETE_CATEGORY', 'categories', cat.id, `Deleted category ${cat.name}`);
      if (editingCategoryId === cat.id) resetCategoryForm();
      notifySuccess(`Deleted category "${cat.name}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${cat.id}`);
    }
  };

  // --- Promo Codes CRUD ---
  const resetPromoForm = () => {
    setEditingPromoId(null);
    setPromoCode('');
    setPromoTitle('');
    setPromoPercent('10');
    setPromoPublished(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const cleanCode = promoCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
    if (cleanCode.length < 2) {
      notifyError('Promo code must be at least 2 alphanumeric characters.');
      return;
    }
    const id = editingPromoId || `promo_${cleanCode.toLowerCase()}`;
    const pct = Math.max(0, Math.min(90, Math.round(Number(promoPercent) || 0)));
    try {
      // Strictly conforms to firestore.rules isValidPromotion: ['code', 'title', 'discountPercent', 'published', 'updatedAt']
      await setDoc(doc(db, 'promotions', id), {
        code: cleanCode,
        title: promoTitle.trim().slice(0, 120) || `${pct}% Off ${cleanCode}`,
        discountPercent: pct,
        published: promoPublished,
        updatedAt: serverTimestamp(),
      });
      await writeAudit(
        editingPromoId ? 'UPDATE_PROMO' : 'CREATE_PROMO',
        'promotions',
        id,
        `Saved promo code ${cleanCode} (${pct}% off)`
      );
      resetPromoForm();
      notifySuccess(`Promo code ${cleanCode} saved.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `promotions/${id}`);
    }
  };

  const handleEditPromo = (pr: Promotion) => {
    setEditingPromoId(pr.id);
    setPromoCode(pr.code);
    setPromoTitle(pr.title);
    setPromoPercent(String(pr.discountPercent));
    setPromoPublished(pr.published);
  };

  const handleDeletePromo = async (pr: Promotion) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'promotions', pr.id));
      await writeAudit('DELETE_PROMO', 'promotions', pr.id, `Deleted promo ${pr.code}`);
      if (editingPromoId === pr.id) resetPromoForm();
      notifySuccess(`Deleted promo "${pr.code}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `promotions/${pr.id}`);
    }
  };

  // --- Services CRUD ---
  const resetServiceForm = () => {
    setEditingServiceId(null);
    setSvcTitle('');
    setSvcCategory('Interior Decoration');
    setSvcPrice('5000');
    setSvcPriceUnit('starting estimate');
    setSvcDesc('');
    setSvcBenefitsText('Certified technical execution\nTransparent KSh Bill of Quantities');
    setSvcBookingNotes('Share room measurements and attach site photos.');
    setSvcImageUrls([SERVICE_IMAGE_PATH]);
    setSvcAvailable(true);
    setSvcPublished(true);
  };

  const handleUploadServiceImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadImagesToStorage(e.target.files, 'services', 'service');
    if (urls.length > 0) {
      setSvcImageUrls((prev) => {
        const cleaned = prev.filter((u) => u !== SERVICE_IMAGE_PATH || prev.length > 1);
        return Array.from(new Set([...cleaned, ...urls])).slice(0, 6);
      });
    }
    e.target.value = '';
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const id = editingServiceId || `svc_${slugify(svcTitle)}_${Date.now().toString().slice(-4)}`;
    const existing = services.find((s) => s.id === id);
    const benefits = svcBenefitsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    const images = svcImageUrls.filter(Boolean).slice(0, 6);
    try {
      await setDoc(doc(db, 'services', id), {
        id,
        title: svcTitle.trim().slice(0, 140),
        slug: slugify(svcTitle) || id,
        description: svcDesc.trim().slice(0, 3000),
        category: svcCategory.trim().slice(0, 80) || 'Interior Decoration',
        benefits: benefits.length > 0 ? benefits : ['Certified installation team'],
        estimatedPriceKsh: Math.max(0, Number(svcPrice) || 0),
        priceUnit: svcPriceUnit.trim().slice(0, 60) || 'starting estimate',
        available: svcAvailable,
        published: svcPublished,
        bookingInstructions: svcBookingNotes.trim().slice(0, 1000),
        imageUrls: images.length > 0 ? images : [SERVICE_IMAGE_PATH],
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAudit(
        editingServiceId ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
        'services',
        id,
        `${editingServiceId ? 'Updated' : 'Created'} service ${svcTitle}`
      );
      resetServiceForm();
      notifySuccess('Service saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `services/${id}`);
    }
  };

  const handleEditService = (svc: ServiceItem) => {
    setEditingServiceId(svc.id);
    setSvcTitle(svc.title);
    setSvcCategory(svc.category);
    setSvcPrice(svc.estimatedPriceKsh ? String(svc.estimatedPriceKsh) : '0');
    setSvcPriceUnit(svc.priceUnit || 'starting estimate');
    setSvcDesc(svc.description);
    setSvcBenefitsText((svc.benefits || []).join('\n'));
    setSvcBookingNotes(svc.bookingInstructions || '');
    setSvcImageUrls(svc.imageUrls.length > 0 ? svc.imageUrls : [SERVICE_IMAGE_PATH]);
    setSvcAvailable(svc.available);
    setSvcPublished(svc.published);
  };

  const handleDeleteService = async (svc: ServiceItem) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'services', svc.id));
      await writeAudit('DELETE_SERVICE', 'services', svc.id, `Deleted service ${svc.title}`);
      if (editingServiceId === svc.id) resetServiceForm();
      notifySuccess(`Deleted service "${svc.title}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `services/${svc.id}`);
    }
  };

  // --- Portfolio CRUD ---
  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjTitle('');
    setProjCategory('Interior Decoration');
    setProjLocation('Nairobi, Kenya');
    setProjCompletionDate('');
    setProjDesc('');
    setProjImageUrls([HERO_IMAGE_PATH]);
    setProjFeatured(true);
    setProjPublished(true);
    setProjIsDemo(false);
  };

  const handleUploadProjectImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadImagesToStorage(e.target.files, 'portfolio', 'portfolio');
    if (urls.length > 0) {
      setProjImageUrls((prev) => {
        const cleaned = prev.filter((u) => u !== HERO_IMAGE_PATH || prev.length > 1);
        return Array.from(new Set([...cleaned, ...urls])).slice(0, 8);
      });
    }
    e.target.value = '';
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const id = editingProjectId || `proj_${slugify(projTitle)}_${Date.now().toString().slice(-4)}`;
    const existing = projects.find((pr) => pr.id === id);
    const images = projImageUrls.filter(Boolean).slice(0, 8);
    try {
      await setDoc(doc(db, 'projects', id), {
        id,
        title: projTitle.trim().slice(0, 140),
        slug: slugify(projTitle) || id,
        category: projCategory.trim().slice(0, 80) || 'Interior Decoration',
        location: projLocation.trim().slice(0, 120),
        description: projDesc.trim().slice(0, 2500),
        imageUrls: images.length > 0 ? images : [HERO_IMAGE_PATH],
        completionDate:
          projCompletionDate.trim().slice(0, 40) ||
          new Date().toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
        featured: projFeatured,
        published: projPublished,
        isDemo: projIsDemo,
        createdAt: existing?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAudit(
        editingProjectId ? 'UPDATE_PORTFOLIO' : 'CREATE_PORTFOLIO',
        'projects',
        id,
        `${editingProjectId ? 'Updated' : 'Published'} portfolio project ${projTitle}`
      );
      resetProjectForm();
      notifySuccess('Portfolio project saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${id}`);
    }
  };

  const handleEditProject = (pr: PortfolioProject) => {
    setEditingProjectId(pr.id);
    setProjTitle(pr.title);
    setProjCategory(pr.category);
    setProjLocation(pr.location || '');
    setProjCompletionDate(pr.completionDate || '');
    setProjDesc(pr.description);
    setProjImageUrls(pr.imageUrls.length > 0 ? pr.imageUrls : [HERO_IMAGE_PATH]);
    setProjFeatured(pr.featured);
    setProjPublished(pr.published);
    setProjIsDemo(pr.isDemo);
  };

  const handleDeleteProject = async (pr: PortfolioProject) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'projects', pr.id));
      await writeAudit('DELETE_PORTFOLIO', 'projects', pr.id, `Deleted portfolio ${pr.title}`);
      if (editingProjectId === pr.id) resetProjectForm();
      notifySuccess(`Removed "${pr.title}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${pr.id}`);
    }
  };

  // --- Orders & Bookings & User Roles ---
  const handleUpdateOrder = async (
    orderId: string,
    customerId: string,
    orderRef: string,
    orderStatus: OrderStatus,
    paymentStatus: PaymentStatus,
    receipt?: string
  ) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus,
        paymentStatus,
        mpesaReceiptNumber: receipt || '',
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'notifications', `notif_${Date.now()}`), {
        userId: customerId,
        title: `Order ${orderRef} Updated`,
        message: `Order status is now ${orderStatus.replace(/_/g, ' ')} (Payment: ${paymentStatus}).`,
        type: 'order',
        read: false,
        linkPath: '/account',
        createdAt: serverTimestamp(),
      });
      await writeAudit(
        'UPDATE_ORDER',
        'orders',
        orderId,
        `Updated ${orderRef} -> ${orderStatus} / ${paymentStatus}`
      );
      notifySuccess(`Updated ${orderRef}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleUpdateBookingStatus = async (booking: Booking, status: BookingStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      await writeAudit('UPDATE_BOOKING', 'bookings', booking.id, `Booking ${booking.bookingRef} -> ${status}`);
      notifySuccess(`Booking ${booking.bookingRef} marked ${status}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  const handleSendQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteBooking) return;
    const amount = Math.max(0, Number(quoteAmount) || 0);
    const quoteId = `qt_${Date.now()}`;
    const quotationRef = `QT-${String(Date.now()).slice(-6)}`;

    try {
      await setDoc(doc(db, 'quotations', quoteId), {
        quotationRef,
        bookingId: quoteBooking.id,
        customerId: quoteBooking.customerId,
        serviceTitle: quoteBooking.serviceTitle,
        lineItemsSummary: quoteItemsText.trim().slice(0, 1500),
        estimatedTotalKsh: amount,
        validUntil: new Date(Date.now() + 14 * 86400_000).toISOString().split('T')[0],
        status: 'sent',
        adminNotes: quoteNotes.trim().slice(0, 1500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'bookings', quoteBooking.id), {
        status: 'quoted',
        quotedAmountKsh: amount,
        quotationNotes: quoteNotes.trim().slice(0, 2000),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'notifications', `notif_${quoteId}`), {
        userId: quoteBooking.customerId,
        title: `Quotation ${quotationRef} Ready`,
        message: `Estimated total ${formatKsh(amount)} for ${quoteBooking.serviceTitle}. Review in Account.`,
        type: 'quotation',
        read: false,
        linkPath: '/account',
        createdAt: serverTimestamp(),
      });
      await writeAudit('SEND_QUOTATION', 'quotations', quoteId, `Sent ${quotationRef} (${formatKsh(amount)})`);
      setQuoteBooking(null);
      setQuoteAmount('');
      setQuoteItemsText('');
      setQuoteNotes('');
      notifySuccess(`Quotation ${quotationRef} sent to customer.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `quotations/${quoteId}`);
    }
  };

  const handleUpdateUserRole = async (target: UserAccount, nextRole: UserRole) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', target.uid), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
      if (nextRole === 'admin') {
        await setDoc(doc(db, 'admins', target.uid), {
          uid: target.uid,
          fullName: target.fullName,
          assignedBy: user.email || user.uid,
          updatedAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, 'staff', target.uid)).catch(() => undefined);
      } else if (nextRole === 'staff') {
        await setDoc(doc(db, 'staff', target.uid), {
          uid: target.uid,
          fullName: target.fullName,
          assignedBy: user.email || user.uid,
          updatedAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, 'admins', target.uid)).catch(() => undefined);
      } else {
        await deleteDoc(doc(db, 'admins', target.uid)).catch(() => undefined);
        await deleteDoc(doc(db, 'staff', target.uid)).catch(() => undefined);
      }
      await writeAudit('UPDATE_USER_ROLE', 'users', target.uid, `${target.fullName} role -> ${nextRole}`);
      notifySuccess(`Updated ${target.fullName} role to ${nextRole}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${target.uid}`);
    }
  };

  const pendingOrdersCount = orders.filter((o) =>
    ['pending', 'awaiting_payment', 'confirmed', 'processing'].includes(o.orderStatus)
  ).length;
  const completedOrdersCount = orders.filter((o) => o.orderStatus === 'delivered').length;
  const lowStockCount = products.filter((p) => p.stockQty <= 8).length;
  const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
  const pendingQuotesCount = quotations.filter((q) => q.status === 'sent').length;

  const isItAdmin = (user.email || '').toLowerCase() === 'josephngotho988@gmail.com';
  const roleTitle = isItAdmin ? 'IT Admin' : isAdmin ? 'Primary Admin' : 'Staff Operator';

  const navItems: Array<{ id: AdminSection; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'customizer', label: 'Storefront Customizer', icon: Palette },
    { id: 'products', label: 'Products & Photos', icon: Package },
    { id: 'catalog_meta', label: 'Categories & Promos', icon: Layers },
    { id: 'services', label: 'Services & Photos', icon: Wrench },
    { id: 'portfolio', label: 'Portfolio & Photos', icon: FolderKanban },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'bookings', label: 'Bookings & Quotes', icon: Briefcase },
    { id: 'customers', label: 'Admins, Users & Logs', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-[#e5e7eb] rounded-lg p-3 shadow-level-1">
          <div className="px-2 py-2.5 border-b border-[#e5e7eb] mb-2 flex items-center gap-2.5">
            <img
              src={effectiveLogoUrl}
              alt={settings.businessName || BRAND_NAME}
              className="w-10 h-10 rounded object-contain border border-[#e5e7eb] bg-white shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#202020] truncate">
                {settings.businessName || BRAND_NAME}
              </p>
              <p className="text-[11px] font-semibold text-[#a81825]">{roleTitle}</p>
              <p className="text-[11px] text-[#6b7280] truncate">{user.email}</p>
            </div>
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`min-h-[42px] px-3 rounded text-xs font-semibold flex items-center gap-2.5 whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'bg-[#a81825] text-white' : 'text-[#202020] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 w-full space-y-6">
          {busyMsg && (
            <div className="p-3 rounded bg-[#e8fbf0] border border-[#00a859]/30 text-xs font-semibold text-[#005228] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#00a859] shrink-0" />
              <span>{busyMsg}</span>
            </div>
          )}
          {errorBanner && (
            <div className="p-3 rounded bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-xs font-semibold text-[#93000a] flex items-center justify-between gap-2">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner('')} aria-label="Dismiss error">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e5e7eb] rounded-lg p-5">
                <div>
                  <h1 className="font-display text-xl font-semibold text-[#202020]">
                    Operations Overview
                  </h1>
                  <p className="text-xs text-[#5a403f] mt-0.5">
                    Customize your storefront, upload product/service photography, and manage orders &amp; quotes live.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleSeedCatalog}
                    className="min-h-[44px] px-4 rounded bg-[#a81825] text-white text-xs font-semibold hover:bg-[#820014] inline-flex items-center gap-2 shrink-0"
                  >
                    <Database className="w-4 h-4" />
                    <span>Publish Starter Catalog &amp; Demo Portfolio</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Orders', value: orders.length },
                  { label: 'Pending Orders', value: pendingOrdersCount },
                  { label: 'Completed Orders', value: completedOrdersCount },
                  { label: 'Registered Users', value: customers.length },
                  { label: 'Products Live', value: products.length },
                  { label: 'Low-Stock Alerts', value: lowStockCount },
                  { label: 'Pending Bookings', value: pendingBookingsCount },
                  { label: 'Active Promos', value: promotions.filter((p) => p.published).length },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4">
                    <p className="text-xs text-[#6b7280]">{kpi.label}</p>
                    <p className="font-display text-2xl font-bold text-[#202020] mt-1 tabular-nums">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSection('customizer')}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-left hover:border-[#a81825] transition-colors space-y-1"
                >
                  <Palette className="w-5 h-5 text-[#a81825]" />
                  <p className="font-display text-sm font-semibold text-[#202020]">
                    Customize Hero &amp; Branding
                  </p>
                  <p className="text-xs text-[#5a403f]">
                    Update hero banner photo, headline, announcement bar, logo, and WhatsApp line.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSection('products')}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-left hover:border-[#a81825] transition-colors space-y-1"
                >
                  <ImagePlus className="w-5 h-5 text-[#a81825]" />
                  <p className="font-display text-sm font-semibold text-[#202020]">
                    Upload Catalog Photos
                  </p>
                  <p className="text-xs text-[#5a403f]">
                    Publish products with up to 8 gallery images, variations, and discounts.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSection('catalog_meta')}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-left hover:border-[#a81825] transition-colors space-y-1"
                >
                  <Tag className="w-5 h-5 text-[#a81825]" />
                  <p className="font-display text-sm font-semibold text-[#202020]">
                    Categories &amp; Promo Codes
                  </p>
                  <p className="text-xs text-[#5a403f]">
                    Create shop categories and percentage discount codes ({pendingQuotesCount} quotes pending).
                  </p>
                </button>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3">
                <h2 className="font-display text-base font-semibold text-[#202020] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#a81825]" />
                  <span>Recent Administrative Activity</span>
                </h2>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-[#6b7280]">No audit log entries recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#f0eded] text-xs">
                    {auditLogs.slice(0, 8).map((log) => (
                      <div key={log.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                        <div>
                          <span className="font-semibold text-[#202020]">{log.action}</span>
                          <span className="text-[#5a403f]"> · {log.summary}</span>
                        </div>
                        <span className="text-[#6b7280]">{formatTimestamp(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'customizer' && (
            <form
              onSubmit={handleSaveCustomizer}
              className="bg-white border border-[#e5e7eb] rounded-lg p-5 md:p-6 space-y-6"
            >
              <div className="border-b border-[#e5e7eb] pb-3">
                <h1 className="font-display text-xl font-semibold text-[#202020]">
                  Storefront Customizer &amp; Contact Settings
                </h1>
                <p className="text-xs text-[#5a403f] mt-0.5">
                  Changes published here update the live storefront Hero Banner, Announcement Bar, Header Logo, WhatsApp, and Delivery Rules immediately.
                </p>
              </div>

              {/* Brand Identity & Logo */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#a81825]">
                  Shop Name, Tagline &amp; Logo Upload
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Shop / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={custBusinessName}
                      onChange={(e) => setCustBusinessName(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Brand Slogan / Tagline
                    </label>
                    <input
                      type="text"
                      value={custTagline}
                      onChange={(e) => setCustTagline(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded">
                  <img
                    src={custLogoUrl || BRAND_LOGO_URL}
                    alt="Brand Logo Preview"
                    className="w-16 h-16 rounded object-contain bg-white border border-[#e5e7eb] shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <label className="block text-xs font-semibold text-[#5a403f]">
                      Storefront Logo (Re-upload any JPG/PNG/WEBP or paste a URL)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={custLogoUrl}
                        onChange={(e) => setCustLogoUrl(e.target.value)}
                        className="flex-1 min-w-[200px] h-10 px-3 border border-[#e5e7eb] rounded text-xs bg-white"
                      />
                      <label className="min-h-[40px] px-3 rounded bg-[#202020] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#333333]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingKey === 'logo' ? 'Uploading...' : 'Re-upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const urls = await uploadImagesToStorage(e.target.files, 'branding', 'logo');
                            if (urls[0]) setCustLogoUrl(urls[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {custLogoUrl !== BRAND_LOGO_URL && (
                        <button
                          type="button"
                          onClick={() => setCustLogoUrl(BRAND_LOGO_URL)}
                          className="min-h-[40px] px-3 rounded border border-[#e5e7eb] text-xs font-semibold text-[#5a403f] hover:text-[#202020]"
                        >
                          Reset to Default Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Announcement Bar */}
              <div className="space-y-3 pt-4 border-t border-[#e5e7eb]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-[#a81825]">
                    Top Announcement Bar
                  </h2>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                    <input
                      type="checkbox"
                      checked={custAnnouncementActive}
                      onChange={(e) => setCustAnnouncementActive(e.target.checked)}
                    />
                    Show Banner on Storefront
                  </label>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={custAnnouncementText}
                  onChange={(e) => setCustAnnouncementText(e.target.value)}
                  placeholder="e.g. Free delivery across Nairobi on orders above KSh 25,000 · Use code STYLAH10 for 10% off"
                  className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                />
              </div>

              {/* Hero Banner Customization */}
              <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#a81825]">
                  Homepage Hero Banner
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Hero Kicker Label
                    </label>
                    <input
                      type="text"
                      value={custHeroKicker}
                      onChange={(e) => setCustHeroKicker(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Hero Headline
                    </label>
                    <input
                      type="text"
                      value={custHeroHeadline}
                      onChange={(e) => setCustHeroHeadline(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={custHeroSubtitle}
                    onChange={(e) => setCustHeroSubtitle(e.target.value)}
                    className="w-full p-3 border border-[#e5e7eb] rounded text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Primary CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={custHeroPrimaryCta}
                      onChange={(e) => setCustHeroPrimaryCta(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Secondary CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={custHeroSecondaryCta}
                      onChange={(e) => setCustHeroSecondaryCta(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded">
                  <div className="w-28 h-20 rounded overflow-hidden border border-[#e5e7eb] bg-white shrink-0">
                    <SmartImage src={custHeroImageUrl || HERO_IMAGE_PATH} alt="Hero Banner Preview" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="block text-xs font-semibold text-[#5a403f]">
                      Hero Showcase Photo (Recommended 4:3 or 16:10 interior image)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={custHeroImageUrl}
                        onChange={(e) => setCustHeroImageUrl(e.target.value)}
                        className="flex-1 min-w-[200px] h-10 px-3 border border-[#e5e7eb] rounded text-xs bg-white"
                      />
                      <label className="min-h-[40px] px-3 rounded bg-[#202020] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#333333]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingKey === 'hero' ? 'Uploading...' : 'Upload Hero Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const urls = await uploadImagesToStorage(e.target.files, 'branding', 'hero');
                            if (urls[0]) setCustHeroImageUrl(urls[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Delivery Fees */}
              <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#a81825]">
                  WhatsApp, Official Email &amp; Delivery Rules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      WhatsApp Business Number (International digits, e.g. 254745280011)
                    </label>
                    <input
                      type="text"
                      value={custWhatsapp}
                      onChange={(e) => setCustWhatsapp(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Official Support Email
                    </label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                    Verified Showroom / Office Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={custLocation}
                    onChange={(e) => setCustLocation(e.target.value)}
                    placeholder="Leave blank if no physical showroom address is published yet"
                    className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Standard Nairobi Delivery Fee (KSh)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={custDeliveryFee}
                      onChange={(e) => setCustDeliveryFee(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5a403f] mb-1">
                      Free Delivery Threshold (KSh)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={custFreeThreshold}
                      onChange={(e) => setCustFreeThreshold(e.target.value)}
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media Channels (Editable anytime) */}
              <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wide text-[#a81825]">
                      Social Media Links (Facebook, Instagram, TikTok)
                    </h2>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      Add or update your official social page URLs below. Saved links render as clickable SVG icons in your storefront footer. Leave blank to hide a channel.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded border border-[#e5e7eb] bg-[#f8f9fa] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <FacebookSvg className="w-4 h-4 text-[#1877F2]" />
                        Facebook URL
                      </span>
                      {custFacebookUrl && (
                        <button
                          type="button"
                          onClick={() => setCustFacebookUrl('')}
                          className="text-[11px] font-semibold text-[#ba1a1a] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={custFacebookUrl}
                      onChange={(e) => setCustFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full h-10 px-3 border border-[#e5e7eb] rounded text-xs bg-white"
                    />
                  </div>

                  <div className="p-3 rounded border border-[#e5e7eb] bg-[#f8f9fa] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <InstagramSvg className="w-4 h-4 text-[#E4405F]" />
                        Instagram URL
                      </span>
                      {custInstagramUrl && (
                        <button
                          type="button"
                          onClick={() => setCustInstagramUrl('')}
                          className="text-[11px] font-semibold text-[#ba1a1a] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={custInstagramUrl}
                      onChange={(e) => setCustInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      className="w-full h-10 px-3 border border-[#e5e7eb] rounded text-xs bg-white"
                    />
                  </div>

                  <div className="p-3 rounded border border-[#e5e7eb] bg-[#f8f9fa] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <TikTokSvg className="w-4 h-4 text-[#202020]" />
                        TikTok URL
                      </span>
                      {custTiktokUrl && (
                        <button
                          type="button"
                          onClick={() => setCustTiktokUrl('')}
                          className="text-[11px] font-semibold text-[#ba1a1a] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={custTiktokUrl}
                      onChange={(e) => setCustTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@yourhandle"
                      className="w-full h-10 px-3 border border-[#e5e7eb] rounded text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isAdmin || savingCustomizer}
                aria-busy={savingCustomizer}
                className="min-h-[48px] px-6 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] disabled:opacity-50"
              >
                {savingCustomizer ? 'Publishing Changes...' : 'Publish Storefront Changes'}
              </button>
            </form>
          )}

          {section === 'products' && (
            <div className="space-y-6">
              {isAdmin && (
                <form
                  onSubmit={handleSaveProduct}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4"
                >
                  <h2 className="font-display text-lg font-semibold text-[#202020]">
                    {editingProductId ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Product Name"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <select
                      value={prodCategoryId}
                      onChange={(e) => setProdCategoryId(e.target.value)}
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      required
                      min={1}
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="Price (KSh)"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={prodDiscountPrice}
                      onChange={(e) => setProdDiscountPrice(e.target.value)}
                      placeholder="Discounted Price KSh (Optional)"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <input
                      type="number"
                      required
                      min={0}
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      placeholder="Stock Quantity"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <input
                      type="text"
                      value={prodVariationsText}
                      onChange={(e) => setProdVariationsText(e.target.value)}
                      placeholder="Variations (comma-separated, e.g. 0.53m x 10m, Warm Brass)"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>

                  {/* Multi-image upload & gallery */}
                  <div className="space-y-2 p-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#5a403f]">
                        Product Gallery ({prodImageUrls.length}/8 images)
                      </span>
                      <label className="min-h-[38px] px-3 rounded bg-[#202020] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#333333]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingKey === 'product' ? 'Uploading...' : 'Upload Photo(s)'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleUploadProductImages}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prodImageUrls.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative w-20 h-16 rounded overflow-hidden border border-[#e5e7eb] bg-white"
                        >
                          <SmartImage src={url} alt={`Product preview ${idx + 1}`} />
                          {prodImageUrls.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove image"
                              onClick={() =>
                                setProdImageUrls((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={prodNewImageUrl}
                        onChange={(e) => setProdNewImageUrl(e.target.value)}
                        placeholder="Or paste an image URL and click Add"
                        className="flex-1 h-10 px-3 border border-[#e5e7eb] rounded text-xs bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!prodNewImageUrl.trim()) return;
                          setProdImageUrls((prev) =>
                            Array.from(new Set([...prev, prodNewImageUrl.trim()])).slice(0, 8)
                          );
                          setProdNewImageUrl('');
                        }}
                        className="h-10 px-3 rounded border border-[#e5e7eb] bg-white text-xs font-semibold hover:bg-[#f0eded]"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <textarea
                      rows={3}
                      required
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      placeholder="Product description & finish details..."
                      className="w-full p-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <textarea
                      rows={3}
                      value={prodSpecsText}
                      onChange={(e) => setProdSpecsText(e.target.value)}
                      placeholder="Technical specifications (one per line)..."
                      className="w-full p-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <input
                          type="checkbox"
                          checked={prodFeatured}
                          onChange={(e) => setProdFeatured(e.target.checked)}
                        />
                        Featured on Homepage
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <input
                          type="checkbox"
                          checked={prodPublished}
                          onChange={(e) => setProdPublished(e.target.checked)}
                        />
                        Published in Shop
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {editingProductId && (
                        <button
                          type="button"
                          onClick={resetProductForm}
                          className="min-h-[44px] px-4 rounded border border-[#e5e7eb] text-xs font-semibold"
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        className="min-h-[44px] px-5 rounded bg-[#a81825] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{editingProductId ? 'Update Product' : 'Publish Product'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fa] border-b border-[#e5e7eb] text-[#5a403f]">
                    <tr>
                      <th className="p-3 font-semibold">Product</th>
                      <th className="p-3 font-semibold">Category</th>
                      <th className="p-3 font-semibold text-right">Price</th>
                      <th className="p-3 font-semibold text-right">Stock</th>
                      <th className="p-3 font-semibold text-right">Status</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eded]">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#fcf9f8]">
                        <td className="p-3 font-medium text-[#202020]">{p.name}</td>
                        <td className="p-3 text-[#5a403f]">{p.categoryName}</td>
                        <td className="p-3 text-right font-semibold tabular-nums">
                          {formatKsh(p.discountedPriceKsh || p.priceKsh)}
                        </td>
                        <td className="p-3 text-right tabular-nums">{p.stockQty}</td>
                        <td className="p-3 text-right">
                          {p.published ? 'Live' : 'Hidden'}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(p)}
                            className="text-[#a81825] font-semibold hover:underline"
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="text-[#ba1a1a] hover:underline inline-flex items-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'catalog_meta' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Categories Manager */}
              <div className="space-y-4">
                {isAdmin && (
                  <form
                    onSubmit={handleSaveCategory}
                    className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3"
                  >
                    <h2 className="font-display text-lg font-semibold text-[#202020]">
                      {editingCategoryId ? 'Edit Category' : 'Add Shop Category'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="Category Name (e.g. Wallpapers)"
                        className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                      />
                      <select
                        value={catType}
                        onChange={(e) =>
                          setCatType(e.target.value as 'product' | 'service' | 'both')
                        }
                        className="h-11 px-3 border border-[#e5e7eb] rounded text-sm bg-white"
                      >
                        <option value="both">Products &amp; Services</option>
                        <option value="product">Products Only</option>
                        <option value="service">Services Only</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={catSortOrder}
                        onChange={(e) => setCatSortOrder(e.target.value)}
                        placeholder="Sort Order"
                        className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                      />
                      <div className="sm:col-span-2 flex gap-2">
                        <input
                          type="text"
                          value={catImageUrl}
                          onChange={(e) => setCatImageUrl(e.target.value)}
                          placeholder="Category Image URL"
                          className="flex-1 h-11 px-3 border border-[#e5e7eb] rounded text-xs"
                        />
                        <label className="min-h-[44px] px-3 rounded border border-[#e5e7eb] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-[#f8f9fa]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingKey === 'category' ? '...' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const urls = await uploadImagesToStorage(
                                e.target.files,
                                'categories',
                                'category'
                              );
                              if (urls[0]) setCatImageUrl(urls[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Short category description..."
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <input
                          type="checkbox"
                          checked={catPublished}
                          onChange={(e) => setCatPublished(e.target.checked)}
                        />
                        Published
                      </label>
                      <div className="flex gap-2">
                        {editingCategoryId && (
                          <button
                            type="button"
                            onClick={resetCategoryForm}
                            className="min-h-[40px] px-3 rounded border border-[#e5e7eb] text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="min-h-[40px] px-4 rounded bg-[#a81825] text-white text-xs font-semibold"
                        >
                          {editingCategoryId ? 'Update Category' : 'Save Category'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-2">
                  <h3 className="font-display text-base font-semibold text-[#202020]">
                    Categories ({categories.length})
                  </h3>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[#f0eded] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded overflow-hidden bg-[#f8f9fa] border border-[#e5e7eb] shrink-0">
                          <SmartImage src={cat.imageUrl} alt={cat.name} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#202020] truncate">{cat.name}</p>
                          <p className="text-[#5a403f]">
                            #{cat.sortOrder} · {cat.type} · {cat.published ? 'Live' : 'Hidden'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditCategory(cat)}
                            className="text-[#a81825] font-semibold hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-[#ba1a1a] hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Promo Codes Manager */}
              <div className="space-y-4">
                {isAdmin && (
                  <form
                    onSubmit={handleSavePromo}
                    className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3"
                  >
                    <h2 className="font-display text-lg font-semibold text-[#202020]">
                      {editingPromoId ? 'Edit Promo Code' : 'Create Discount Promo Code'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Code (e.g. STYLAH10)"
                        className="h-11 px-3 border border-[#e5e7eb] rounded text-sm uppercase"
                      />
                      <input
                        type="number"
                        required
                        min={1}
                        max={90}
                        value={promoPercent}
                        onChange={(e) => setPromoPercent(e.target.value)}
                        placeholder="Discount % (1-90)"
                        className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      placeholder="Promotion Title (e.g. 10% Seasonal Interior Discount)"
                      className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <input
                          type="checkbox"
                          checked={promoPublished}
                          onChange={(e) => setPromoPublished(e.target.checked)}
                        />
                        Active at Checkout
                      </label>
                      <div className="flex gap-2">
                        {editingPromoId && (
                          <button
                            type="button"
                            onClick={resetPromoForm}
                            className="min-h-[40px] px-3 rounded border border-[#e5e7eb] text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="min-h-[40px] px-4 rounded bg-[#a81825] text-white text-xs font-semibold"
                        >
                          {editingPromoId ? 'Update Promo' : 'Publish Promo Code'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-2">
                  <h3 className="font-display text-base font-semibold text-[#202020]">
                    Discount Promo Codes ({promotions.length})
                  </h3>
                  {promotions.length === 0 ? (
                    <p className="text-xs text-[#6b7280]">No promo codes published yet.</p>
                  ) : (
                    promotions.map((pr) => (
                      <div
                        key={pr.id}
                        className="flex items-center justify-between gap-3 py-2.5 border-b border-[#f0eded] text-xs"
                      >
                        <div>
                          <p className="font-display font-bold text-[#202020]">
                            {pr.code} · {pr.discountPercent}% OFF
                          </p>
                          <p className="text-[#5a403f]">
                            {pr.title} · {pr.published ? 'Active' : 'Paused'}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditPromo(pr)}
                              className="text-[#a81825] font-semibold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(pr)}
                              className="text-[#ba1a1a] hover:underline"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'services' && (
            <div className="space-y-6">
              {isAdmin && (
                <form
                  onSubmit={handleSaveService}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4"
                >
                  <h2 className="font-display text-lg font-semibold text-[#202020]">
                    {editingServiceId ? 'Edit Service' : 'Add Installation / Design Service'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      value={svcTitle}
                      onChange={(e) => setSvcTitle(e.target.value)}
                      placeholder="Service Title"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      required
                      value={svcCategory}
                      onChange={(e) => setSvcCategory(e.target.value)}
                      placeholder="Category"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={svcPrice}
                      onChange={(e) => setSvcPrice(e.target.value)}
                      placeholder="Est. Price KSh"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={svcPriceUnit}
                      onChange={(e) => setSvcPriceUnit(e.target.value)}
                      placeholder="Price Unit (e.g. per roll installed)"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <input
                      type="text"
                      value={svcBookingNotes}
                      onChange={(e) => setSvcBookingNotes(e.target.value)}
                      placeholder="Booking instructions for customers"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>

                  {/* Service Images */}
                  <div className="space-y-2 p-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#5a403f]">
                        Service Photos ({svcImageUrls.length}/6)
                      </span>
                      <label className="min-h-[38px] px-3 rounded bg-[#202020] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#333333]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingKey === 'service' ? 'Uploading...' : 'Upload Service Photo(s)'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleUploadServiceImages}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {svcImageUrls.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative w-20 h-16 rounded overflow-hidden border border-[#e5e7eb] bg-white"
                        >
                          <SmartImage src={url} alt={`Service view ${idx + 1}`} />
                          {svcImageUrls.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove service image"
                              onClick={() =>
                                setSvcImageUrls((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <textarea
                      rows={3}
                      required
                      value={svcDesc}
                      onChange={(e) => setSvcDesc(e.target.value)}
                      placeholder="Service scope description..."
                      className="w-full p-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <textarea
                      rows={3}
                      value={svcBenefitsText}
                      onChange={(e) => setSvcBenefitsText(e.target.value)}
                      placeholder="Service benefits (one per line)..."
                      className="w-full p-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <input
                          type="checkbox"
                          checked={svcAvailable}
                          onChange={(e) => setSvcAvailable(e.target.checked)}
                        />
                        Accepting Bookings
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202020]">
                        <input
                          type="checkbox"
                          checked={svcPublished}
                          onChange={(e) => setSvcPublished(e.target.checked)}
                        />
                        Published
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {editingServiceId && (
                        <button
                          type="button"
                          onClick={resetServiceForm}
                          className="min-h-[44px] px-4 rounded border border-[#e5e7eb] text-xs font-semibold"
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        className="min-h-[44px] px-5 rounded bg-[#a81825] text-white text-xs font-semibold"
                      >
                        {editingServiceId ? 'Update Service' : 'Publish Service'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-2">
                <h3 className="font-display text-base font-semibold text-[#202020]">
                  Published Services ({services.length})
                </h3>
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-[#f0eded] text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-10 rounded overflow-hidden bg-[#f8f9fa] border border-[#e5e7eb] shrink-0">
                        <SmartImage src={s.imageUrls[0]} alt={s.title} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#202020] truncate">{s.title}</p>
                        <p className="text-[#5a403f]">
                          {s.category} · {s.available ? 'Accepting Bookings' : 'Waitlist'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-display font-bold tabular-nums">
                        {s.estimatedPriceKsh ? formatKsh(s.estimatedPriceKsh) : 'Custom'}
                      </span>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditService(s)}
                            className="text-[#a81825] font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(s)}
                            className="text-[#ba1a1a] hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'portfolio' && (
            <div className="space-y-6">
              {isAdmin && (
                <form
                  onSubmit={handleSaveProject}
                  className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4"
                >
                  <h2 className="font-display text-lg font-semibold text-[#202020]">
                    {editingProjectId ? 'Edit Portfolio Project' : 'Add Portfolio Project'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      value={projTitle}
                      onChange={(e) => setProjTitle(e.target.value)}
                      placeholder="Project Title"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      required
                      value={projCategory}
                      onChange={(e) => setProjCategory(e.target.value)}
                      placeholder="Category"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                    <input
                      type="text"
                      value={projLocation}
                      onChange={(e) => setProjLocation(e.target.value)}
                      placeholder="Location (e.g. Karen, Nairobi)"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>

                  {/* Portfolio Multi-Image Upload */}
                  <div className="space-y-2 p-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#5a403f]">
                        Site / Project Gallery ({projImageUrls.length}/8)
                      </span>
                      <label className="min-h-[38px] px-3 rounded bg-[#202020] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#333333]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingKey === 'portfolio'
                            ? 'Uploading...'
                            : 'Upload Project Photo(s)'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleUploadProjectImages}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {projImageUrls.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative w-20 h-16 rounded overflow-hidden border border-[#e5e7eb] bg-white"
                        >
                          <SmartImage src={url} alt={`Project view ${idx + 1}`} />
                          {projImageUrls.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove project photo"
                              onClick={() =>
                                setProjImageUrls((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <textarea
                      rows={2}
                      required
                      value={projDesc}
                      onChange={(e) => setProjDesc(e.target.value)}
                      placeholder="Project materials and scope summary..."
                      className="w-full p-3 border border-[#e5e7eb] rounded text-sm md:col-span-2"
                    />
                    <input
                      type="text"
                      value={projCompletionDate}
                      onChange={(e) => setProjCompletionDate(e.target.value)}
                      placeholder="Completion Date (e.g. Nov 2026)"
                      className="h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-xs text-[#5a403f]">
                        <input
                          type="checkbox"
                          checked={projIsDemo}
                          onChange={(e) => setProjIsDemo(e.target.checked)}
                        />
                        Label as Demonstration Showcase
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-[#202020] font-semibold">
                        <input
                          type="checkbox"
                          checked={projFeatured}
                          onChange={(e) => setProjFeatured(e.target.checked)}
                        />
                        Featured
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-[#202020] font-semibold">
                        <input
                          type="checkbox"
                          checked={projPublished}
                          onChange={(e) => setProjPublished(e.target.checked)}
                        />
                        Published
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {editingProjectId && (
                        <button
                          type="button"
                          onClick={resetProjectForm}
                          className="min-h-[44px] px-4 rounded border border-[#e5e7eb] text-xs font-semibold"
                        >
                          Cancel Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        className="min-h-[44px] px-5 rounded bg-[#a81825] text-white text-xs font-semibold"
                      >
                        {editingProjectId ? 'Update Project' : 'Publish Project'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-2">
                <h3 className="font-display text-base font-semibold text-[#202020]">
                  Portfolio Entries ({projects.length})
                </h3>
                {projects.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-[#f0eded] text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-10 rounded overflow-hidden bg-[#f8f9fa] border border-[#e5e7eb] shrink-0">
                        <SmartImage src={pr.imageUrls[0]} alt={pr.title} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#202020] truncate">{pr.title}</p>
                        <p className="text-[#5a403f]">
                          {pr.category} · {pr.location} {pr.isDemo ? '· Demo' : ''}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditProject(pr)}
                          className="text-[#a81825] font-semibold hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(pr)}
                          className="text-[#ba1a1a] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'orders' && (
            <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#202020]">
                Order Fulfilment &amp; M-Pesa Verification ({orders.length})
              </h2>
              {orders.length === 0 ? (
                <p className="text-sm text-[#5a403f]">No customer orders placed yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div key={ord.id} className="border border-[#e5e7eb] rounded p-4 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-display text-sm font-bold text-[#202020]">
                            {ord.orderRef}
                          </span>
                          <span className="text-[#5a403f]">
                            {' '}
                            · {ord.customerName} ({ord.customerPhone}) · {ord.deliveryTown}
                          </span>
                        </div>
                        <span className="font-display text-sm font-bold text-[#202020] tabular-nums">
                          {formatKsh(ord.totalKsh)}
                        </span>
                      </div>
                      <p className="text-[#5a403f]">
                        {ord.itemsSummary} · Address: {ord.deliveryAddress}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f0eded]">
                        <select
                          aria-label={`Order status for ${ord.orderRef}`}
                          value={ord.orderStatus}
                          onChange={(e) =>
                            handleUpdateOrder(
                              ord.id,
                              ord.customerId,
                              ord.orderRef,
                              e.target.value as OrderStatus,
                              ord.paymentStatus,
                              ord.mpesaReceiptNumber
                            )
                          }
                          className="h-10 px-2.5 border border-[#e5e7eb] rounded bg-white"
                        >
                          {[
                            'pending',
                            'awaiting_payment',
                            'confirmed',
                            'processing',
                            'ready_for_dispatch',
                            'dispatched',
                            'delivered',
                            'cancelled',
                          ].map((s) => (
                            <option key={s} value={s}>
                              Order: {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label={`Payment status for ${ord.orderRef}`}
                          value={ord.paymentStatus}
                          onChange={(e) =>
                            handleUpdateOrder(
                              ord.id,
                              ord.customerId,
                              ord.orderRef,
                              ord.orderStatus,
                              e.target.value as PaymentStatus,
                              ord.mpesaReceiptNumber
                            )
                          }
                          className="h-10 px-2.5 border border-[#e5e7eb] rounded bg-white"
                        >
                          {['unpaid', 'pending', 'paid', 'failed'].map((ps) => (
                            <option key={ps} value={ps}>
                              Payment: {ps}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'bookings' && (
            <div className="space-y-6">
              {quoteBooking && (
                <form
                  onSubmit={handleSendQuotation}
                  className="bg-white border-2 border-[#a81825] rounded-lg p-5 space-y-3"
                >
                  <h2 className="font-display text-base font-semibold text-[#202020]">
                    Issue Quotation for {quoteBooking.bookingRef} ({quoteBooking.customerName})
                  </h2>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="Total Estimated Quote (KSh)"
                    className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                  />
                  <textarea
                    rows={2}
                    required
                    value={quoteItemsText}
                    onChange={(e) => setQuoteItemsText(e.target.value)}
                    placeholder="Breakdown of materials, installation labor, and timeline..."
                    className="w-full p-3 border border-[#e5e7eb] rounded text-sm"
                  />
                  <input
                    type="text"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Additional technician notes (Optional)"
                    className="w-full h-11 px-3 border border-[#e5e7eb] rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="min-h-[44px] px-5 rounded bg-[#00a859] text-white text-xs font-semibold"
                    >
                      Send Quotation to Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteBooking(null)}
                      className="min-h-[44px] px-4 rounded border border-[#e5e7eb] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3">
                <h2 className="font-display text-lg font-semibold text-[#202020]">
                  Customer Service Requests ({bookings.length})
                </h2>
                {bookings.length === 0 ? (
                  <p className="text-sm text-[#5a403f]">No booking requests yet.</p>
                ) : (
                  bookings.map((bk) => (
                    <div key={bk.id} className="border border-[#e5e7eb] rounded p-4 space-y-2 text-xs">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#202020]">
                          {bk.bookingRef} · {bk.serviceTitle}
                        </span>
                        <span className="font-semibold text-[#a81825] capitalize">{bk.status}</span>
                      </div>
                      <p className="text-[#5a403f]">
                        {bk.customerName} · {bk.phoneNumber} · {bk.locationTown} · Preferred: {bk.preferredDate}
                      </p>
                      <p className="text-[#202020]">{bk.projectDescription}</p>
                      {bk.attachmentUrls && bk.attachmentUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {bk.attachmentUrls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#a81825] underline font-medium"
                            >
                              Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f0eded]">
                        <select
                          aria-label={`Status for ${bk.bookingRef}`}
                          value={bk.status}
                          onChange={(e) => handleUpdateBookingStatus(bk, e.target.value as BookingStatus)}
                          className="h-9 px-2.5 border border-[#e5e7eb] rounded bg-white"
                        >
                          {['pending', 'reviewing', 'quoted', 'scheduled', 'completed', 'cancelled'].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteBooking(bk);
                            setQuoteAmount(bk.quotedAmountKsh ? String(bk.quotedAmountKsh) : '');
                          }}
                          className="min-h-[36px] px-3 rounded bg-[#a81825] text-white font-semibold"
                        >
                          Issue / Update Quotation
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {section === 'customers' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#a81825]" />
                  <h2 className="font-display text-lg font-semibold text-[#202020]">
                    Authorized Administrators
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded bg-[#f8f9fa] border border-[#e5e7eb] space-y-1">
                    <p className="font-semibold text-[#202020]">Primary Owner Admin</p>
                    <p className="text-[#5a403f]">stylahindustries297@gmail.com</p>
                  </div>
                  <div className="p-3.5 rounded bg-[#f8f9fa] border border-[#e5e7eb] space-y-1">
                    <p className="font-semibold text-[#202020]">IT Administrator</p>
                    <p className="text-[#5a403f]">josephngotho988@gmail.com</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 space-y-4">
                <h2 className="font-display text-lg font-semibold text-[#202020]">
                  Registered Accounts ({customers.length})
                </h2>
                <div className="divide-y divide-[#f0eded] text-xs">
                  {customers.map((c) => (
                    <div key={c.uid} className="py-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#202020]">{c.fullName}</p>
                        <p className="text-[#6b7280]">
                          UID: {c.uid.slice(0, 10)}… · Status: {c.accountStatus} ·{' '}
                          <span className="tabular-nums">
                            {orders.filter((o) => o.customerId === c.uid).length} orders
                          </span>
                        </p>
                      </div>
                      {isAdmin && c.uid !== user.uid && (
                        <select
                          aria-label={`Role for ${c.fullName}`}
                          value={c.role}
                          onChange={(e) => handleUpdateUserRole(c, e.target.value as UserRole)}
                          className="h-9 px-2.5 border border-[#e5e7eb] rounded bg-white"
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
