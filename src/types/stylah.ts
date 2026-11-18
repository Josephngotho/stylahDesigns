export type UserRole = 'customer' | 'staff' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface UserAccount {
  uid: string;
  fullName: string;
  profileImage?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phoneNumber?: string;
  deliveryTown?: string;
  deliveryAddress?: string;
  fcmToken?: string;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'product' | 'service' | 'both';
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  published: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string;
  priceKsh: number;
  discountedPriceKsh?: number;
  stockQty: number;
  availabilityStatus: AvailabilityStatus;
  featured: boolean;
  published: boolean;
  imageUrls: string[];
  variations?: string[];
  specifications?: string[];
  searchKeywords?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  benefits: string[];
  estimatedPriceKsh?: number;
  priceUnit?: string;
  available: boolean;
  published: boolean;
  bookingInstructions?: string;
  imageUrls: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPriceKsh: number;
  imageUrl?: string;
  updatedAt?: unknown;
}

export type PaymentMethod = 'mpesa_stk' | 'pay_on_delivery';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';
export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'processing'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderRef: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryTown: string;
  deliveryAddress: string;
  itemsSummary: string;
  itemCount: number;
  subtotalKsh: number;
  deliveryFeeKsh: number;
  discountKsh: number;
  totalKsh: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  mpesaCheckoutRequestId?: string;
  mpesaReceiptNumber?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderLineItem {
  id?: string;
  orderId: string;
  customerId: string;
  productId: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPriceKsh: number;
  lineTotalKsh: number;
}

export type BookingStatus = 'pending' | 'reviewing' | 'quoted' | 'scheduled' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  bookingRef: string;
  customerId: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  locationTown: string;
  serviceId: string;
  serviceTitle: string;
  projectDescription: string;
  preferredDate: string;
  attachmentUrls?: string[];
  status: BookingStatus;
  quotedAmountKsh?: number;
  quotationNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface Quotation {
  id: string;
  quotationRef: string;
  bookingId: string;
  customerId: string;
  serviceTitle: string;
  lineItemsSummary: string;
  estimatedTotalKsh: number;
  validUntil?: string;
  status: QuotationStatus;
  adminNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PortfolioProject {
  id: string;
  title: string;
  slug: string;
  category: string;
  location?: string;
  description: string;
  imageUrls: string[];
  completionDate?: string;
  featured: boolean;
  published: boolean;
  isDemo: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'booking' | 'quotation' | 'announcement';
  read: boolean;
  linkPath?: string;
  createdAt?: unknown;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  published: boolean;
  createdAt?: unknown;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  discountPercent: number;
  published: boolean;
  updatedAt?: unknown;
}

export interface RoleEntry {
  uid: string;
  email?: string;
  label?: string;
  assignedBy?: string;
}

export interface PublicSettings {
  businessName: string;
  tagline?: string;
  logoUrl?: string;
  announcementText?: string;
  announcementActive?: boolean;
  heroKicker?: string;
  heroHeadline?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  heroPrimaryCta?: string;
  heroSecondaryCta?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  showroomLocation?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  standardDeliveryFeeKsh: number;
  freeDeliveryThresholdKsh: number;
  updatedAt?: unknown;
}

export const BRAND_NAME = 'Stylah Designs & Interiors';
export const BRAND_TAGLINE = 'Transforming Walls, Elevating Spaces.';
export const BRAND_LOGO_URL = '/assets/aistudio/STYLAH_LOGO_788598bc.jpeg';
export const DEFAULT_WHATSAPP_NUMBER = '254745280011';
export const DEFAULT_SUPPORT_EMAIL = 'stylahindustries297@gmail.com';

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetCollection: string;
  targetId: string;
  summary: string;
  createdAt?: unknown;
}

export type AppTab = 'home' | 'shop' | 'cart' | 'services' | 'portfolio' | 'account' | 'admin';

export const KENYAN_PHONE_REGEX = /^(\+254|0)[17]\d{8}$/;

export function normalizeKenyanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned;
  if (/^254[17]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0[17]\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  return null;
}

export function formatKsh(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Just now';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (typeof ts === 'string') {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return 'Recent';
}
