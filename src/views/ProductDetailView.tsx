import { ArrowLeft, Check, Heart, MessageCircle, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { ProductCard } from '../components/ProductCard';
import { SmartImage } from '../components/SmartImage';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { applySeoMeta } from '../lib/seo';
import { buildWhatsAppLink } from '../lib/whatsapp';
import { AppTab, formatKsh, formatTimestamp, Product, ProductReview } from '../types/stylah';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onNavigate: (tab: AppTab) => void;
}

export function ProductDetailView({
  product,
  onBack,
  onSelectProduct,
  onNavigate,
}: ProductDetailViewProps) {
  const { user, profile } = useAuth();
  const { products, addToCart, favourites, toggleFavourite, effectiveWhatsappNumber } = useStore();

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(product.variations?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  useEffect(() => {
    setActiveImgIdx(0);
    setSelectedVariant(product.variations?.[0] || '');
    setQuantity(1);
    const activePrice =
      product.discountedPriceKsh && product.discountedPriceKsh > 0 && product.discountedPriceKsh < product.priceKsh
        ? product.discountedPriceKsh
        : product.priceKsh;

    applySeoMeta({
      title: `${product.name} | Stylah Designs & Interiors`,
      description: product.description.slice(0, 155),
      path: `/shop/${product.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        category: product.categoryName,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'KES',
          price: activePrice,
          availability:
            product.availabilityStatus === 'out_of_stock'
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
        },
      },
    });
  }, [product]);

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', product.id),
      where('published', '==', true)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(snap.docs.map((d) => ({ ...(d.data() as ProductReview), id: d.id })));
      },
      () => undefined
    );
    return () => unsub();
  }, [product.id]);

  const isFav = favourites.includes(product.id);
  const hasDiscount =
    typeof product.discountedPriceKsh === 'number' &&
    product.discountedPriceKsh > 0 &&
    product.discountedPriceKsh < product.priceKsh;
  const activePrice = hasDiscount ? product.discountedPriceKsh! : product.priceKsh;

  const relatedProducts = useMemo(
    () => products.filter((p) => p.id !== product.id && p.categoryId === product.categoryId).slice(0, 4),
    [products, product]
  );

  const whatsappUrl = buildWhatsAppLink(
    effectiveWhatsappNumber,
    `Hello Stylah, I am enquiring about "${product.name}" (${selectedVariant || 'Standard'}) listed at ${formatKsh(
      activePrice
    )}.`
  );

  const handleAdd = async () => {
    if (product.availabilityStatus === 'out_of_stock') return;
    await addToCart(product, quantity, selectedVariant);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 1800);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) {
      setReviewNotice('Please sign in with a verified account to submit a review.');
      return;
    }
    if (comment.trim().length < 5) {
      setReviewNotice('Please write at least 5 characters for your review.');
      return;
    }
    setSubmittingReview(true);
    setReviewNotice('');
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        userId: user.uid,
        authorName: profile?.fullName || user.displayName || 'Verified Customer',
        rating,
        comment: comment.trim().slice(0, 1000),
        published: true,
        createdAt: serverTimestamp(),
      });
      setComment('');
      setReviewNotice('Thank you. Your review has been published.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-10 pb-20">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-[#5a403f] hover:text-[#202020]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Shop</span>
      </button>

      {/* Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-3">
          <div className="aspect-[4/3] bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-level-1">
            <SmartImage
              src={product.imageUrls[activeImgIdx] || product.imageUrls[0]}
              alt={product.name}
              fallbackTitle={product.name}
            />
          </div>
          {product.imageUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {product.imageUrls.map((url, idx) => (
                <button
                  key={`${url}-${idx}`}
                  type="button"
                  onClick={() => setActiveImgIdx(idx)}
                  className={`w-20 h-16 rounded border overflow-hidden shrink-0 ${
                    activeImgIdx === idx ? 'border-2 border-[#a81825]' : 'border-[#e5e7eb]'
                  }`}
                >
                  <SmartImage src={url} alt={`${product.name} view ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-[#e5e7eb] rounded-lg p-6 shadow-level-1 space-y-5">
          <div>
            <p className="text-xs text-[#6b7280] mb-1">
              {product.categoryName} · {product.stockQty} units available
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#202020] leading-tight">
              {product.name}
            </h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-[#202020] tabular-nums">
              {formatKsh(activePrice)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-[#6b7280] line-through tabular-nums">
                {formatKsh(product.priceKsh)}
              </span>
            )}
          </div>

          <p className="text-sm text-[#5a403f] leading-relaxed">{product.description}</p>

          {product.variations && product.variations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#202020]">Variation / Dimension</p>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`min-h-[44px] px-3.5 rounded text-xs font-medium border transition-colors ${
                      selectedVariant === v
                        ? 'bg-[#a81825] text-white border-[#a81825]'
                        : 'bg-[#f8f9fa] text-[#202020] border-[#e5e7eb] hover:bg-[#f0eded]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Primary Purchase CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center border border-[#e5e7eb] rounded h-12 bg-white">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-12 h-12 flex items-center justify-center text-[#202020] hover:bg-[#f8f9fa]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stockQty || 50), q + 1))}
                className="w-12 h-12 flex items-center justify-center text-[#202020] hover:bg-[#f8f9fa]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={product.availabilityStatus === 'out_of_stock'}
              onClick={handleAdd}
              className="flex-1 min-w-[180px] min-h-[48px] px-5 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] disabled:bg-[#dcd9d9] disabled:text-[#6b7280] transition-colors inline-flex items-center justify-center gap-2"
            >
              {addedToast ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              <span>
                {product.availabilityStatus === 'out_of_stock'
                  ? 'Out of Stock'
                  : addedToast
                  ? 'Added to Cart'
                  : 'Add to Cart'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => (user ? toggleFavourite(product.id) : onNavigate('account'))}
              aria-label="Toggle favourite"
              className="w-12 h-12 rounded border border-[#e5e7eb] flex items-center justify-center hover:bg-[#f8f9fa]"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-[#a81825] text-[#a81825]' : 'text-[#202020]'}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {addedToast && (
              <button
                type="button"
                onClick={() => onNavigate('cart')}
                className="min-h-[44px] px-4 rounded border border-[#a81825] text-[#a81825] text-xs font-semibold hover:bg-[#ffdad7]/30"
              >
                Proceed to Checkout
              </button>
            )}

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 rounded bg-[#e8fbf0] text-[#178a43] text-xs font-semibold hover:bg-[#d7f7e4] inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#25d366]" />
                <span>Ask via WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="min-h-[44px] px-4 rounded bg-[#e8fbf0] text-[#178a43] text-xs font-semibold hover:bg-[#d7f7e4] inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#25d366]" />
                <span>Request Installation Quote</span>
              </button>
            )}
          </div>

          {product.specifications && product.specifications.length > 0 && (
            <div className="pt-4 border-t border-[#e5e7eb] space-y-2">
              <h2 className="font-display text-sm font-semibold text-[#202020]">Technical Specifications</h2>
              <ul className="space-y-1.5 text-sm text-[#5a403f]">
                {product.specifications.map((spec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#a81825] mt-1">•</span>
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews (Verified Only — Never Fabricated) */}
      <section className="bg-white border border-[#e5e7eb] rounded-lg p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e7eb] pb-3">
          <h2 className="font-display text-lg font-semibold text-[#202020]">
            Verified Customer Reviews ({reviews.length})
          </h2>
          <span className="text-xs text-[#6b7280]">Published directly by verified customers</span>
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-[#5a403f]">No customer reviews submitted for this product yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="border border-[#e5e7eb] rounded p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#6b7280]">
                  <span className="font-semibold text-[#202020]">{rev.authorName}</span>
                  <span>{formatTimestamp(rev.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1 text-[#a81825]">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-[#a81825]" />
                  ))}
                </div>
                <p className="text-sm text-[#5a403f]">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-[#e5e7eb] space-y-3 max-w-xl">
          <h3 className="text-sm font-semibold text-[#202020]">Write a Review</h3>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} stars`}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded border border-[#e5e7eb]"
              >
                <Star className={`w-4 h-4 ${star <= rating ? 'fill-[#a81825] text-[#a81825]' : 'text-[#6b7280]'}`} />
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your feedback on finish quality, delivery, or installation..."
            className="w-full p-3 border border-[#e5e7eb] rounded text-sm focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
          />
          {reviewNotice && <p className="text-xs text-[#a81825]">{reviewNotice}</p>}
          <button
            type="submit"
            disabled={submittingReview}
            className="min-h-[44px] px-5 rounded bg-[#202020] text-white text-xs font-semibold hover:bg-[#333333] disabled:opacity-50"
          >
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#202020]">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                onSelect={onSelectProduct}
                onRequireAuth={() => onNavigate('account')}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
