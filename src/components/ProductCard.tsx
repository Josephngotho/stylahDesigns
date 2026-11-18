import { Heart, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { formatKsh, Product } from '../types/stylah';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onRequireAuth?: () => void;
}

export function ProductCard({ product, onSelect, onRequireAuth }: ProductCardProps) {
  const { user } = useAuth();
  const { addToCart, favourites, toggleFavourite } = useStore();
  const [added, setAdded] = useState(false);

  const isFav = favourites.includes(product.id);
  const hasDiscount =
    typeof product.discountedPriceKsh === 'number' &&
    product.discountedPriceKsh > 0 &&
    product.discountedPriceKsh < product.priceKsh;
  const activePrice = hasDiscount ? product.discountedPriceKsh! : product.priceKsh;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.availabilityStatus === 'out_of_stock') return;
    await addToCart(product, 1, product.variations?.[0]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleFavourite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    await toggleFavourite(product.id);
  };

  return (
    <article
      onClick={() => onSelect(product)}
      className="group cursor-pointer bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-level-1 hover:-translate-y-0.5 hover:shadow-level-2 transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-[#f8f9fa] overflow-hidden">
        <SmartImage
          src={product.imageUrls[0]}
          alt={product.name}
          fallbackTitle={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        <button
          type="button"
          onClick={handleFavourite}
          aria-label={isFav ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
          className="absolute top-2 right-2 w-11 h-11 rounded-full bg-white/90 border border-[#e5e7eb] flex items-center justify-center text-[#202020] hover:text-[#a81825] transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-[#a81825] text-[#a81825]' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#6b7280] mb-1">
            <span className="truncate">{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span className={product.availabilityStatus === 'out_of_stock' ? 'text-[#ba1a1a]' : ''}>
              {product.availabilityStatus === 'in_stock'
                ? 'In Stock'
                : product.availabilityStatus === 'low_stock'
                ? 'Low Stock'
                : product.availabilityStatus === 'pre_order'
                ? 'Pre-Order'
                : 'Out of Stock'}
            </span>
          </div>
          <h3 className="font-display text-base font-semibold text-[#202020] leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#f0eded]">
          <div className="flex flex-col">
            <span className="font-display text-base sm:text-lg font-bold text-[#202020] tabular-nums">
              {formatKsh(activePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#6b7280] line-through tabular-nums">
                {formatKsh(product.priceKsh)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={product.availabilityStatus === 'out_of_stock'}
            onClick={handleQuickAdd}
            className={`min-h-[44px] px-3.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors ${
              product.availabilityStatus === 'out_of_stock'
                ? 'bg-[#f5f5f5] text-[#6b7280] cursor-not-allowed'
                : added
                ? 'bg-[#00a859] text-white'
                : 'bg-[#a81825] text-white hover:bg-[#820014]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{added ? 'Added' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
