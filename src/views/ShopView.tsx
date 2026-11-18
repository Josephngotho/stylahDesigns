import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { seedStarterFirestoreData } from '../lib/seedData';
import { applySeoMeta } from '../lib/seo';
import { AppTab, Product } from '../types/stylah';

interface ShopViewProps {
  onSelectProduct: (product: Product) => void;
  onNavigate: (tab: AppTab) => void;
}

export function ShopView({ onSelectProduct, onNavigate }: ShopViewProps) {
  const { user, isAdmin } = useAuth();
  const { categories, products, catalogLoading } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    applySeoMeta({
      title: 'Shop Wallpapers, Murals, Chandeliers & CCTV Kenya | Stylah Designs & Interiors',
      description:
        'Browse architectural wallpapers, wall murals, luxury lighting chandeliers, acoustic panels, and 4K CCTV cameras in Kenya priced in KSh.',
      path: '/shop',
    });
  }, []);

  const productCategories = useMemo(
    () => categories.filter((c) => c.type === 'product' || c.type === 'both'),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (!q) return true;
      const hay = `${p.name} ${p.categoryName} ${p.description} ${(p.searchKeywords || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    const getEffectivePrice = (p: Product) =>
      p.discountedPriceKsh && p.discountedPriceKsh > 0 && p.discountedPriceKsh < p.priceKsh
        ? p.discountedPriceKsh
        : p.priceKsh;

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    }
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [products, selectedCategory, searchTerm, sortBy]);

  const handleSeedNow = async () => {
    if (!user || !isAdmin) return;
    setSeeding(true);
    try {
      await seedStarterFirestoreData(user.uid, user.email || '');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#202020]">
            Architectural Products &amp; Tech
          </h1>
          <p className="text-sm text-[#5a403f] mt-1">
            Wallpapers, wall murals, lighting, CCTV systems, and interior finishes priced in KSh.
          </p>
        </div>
        <span className="text-xs font-medium text-[#6b7280] tabular-nums">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6b7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search wallpapers, murals, chandeliers, CCTV..."
            aria-label="Search products"
            className="w-full h-12 pl-10 pr-4 bg-white border border-[#e5e7eb] rounded text-sm text-[#202020] placeholder:text-[#6b7280] focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-[#5a403f]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')}
            aria-label="Sort products"
            className="h-12 px-3.5 bg-white border border-[#e5e7eb] rounded text-sm text-[#202020] focus:outline-none focus:border-[1.5px] focus:border-[#a81825]"
          >
            <option value="featured">Featured First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Scrollable Category Filter Chips (48px touch zone) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1" role="tablist" aria-label="Product categories">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#a81825] text-white'
              : 'bg-[#f5f5f5] text-[#202020] hover:bg-[#eae7e7]'
          }`}
        >
          All Categories
        </button>
        {productCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[#a81825] text-white'
                : 'bg-[#f5f5f5] text-[#202020] hover:bg-[#eae7e7]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid or Empty State */}
      {catalogLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-white border border-[#e5e7eb] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-10 text-center space-y-3">
          <Sparkles className="w-6 h-6 text-[#a81825] mx-auto" />
          <h2 className="font-display text-lg font-semibold text-[#202020]">
            {products.length === 0 ? 'No Products Published Yet' : 'No Matching Products Found'}
          </h2>
          <p className="text-sm text-[#5a403f] max-w-md mx-auto">
            {products.length === 0
              ? 'Products load directly from Cloud Firestore. Publish the editable starter catalog as administrator to begin.'
              : 'Try adjusting your search query or clearing your active category filter.'}
          </p>
          {products.length === 0 && isAdmin ? (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedNow}
              className="min-h-[48px] px-6 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] transition-colors"
            >
              {seeding ? 'Publishing Starter Catalog...' : 'Publish Starter Catalog to Firestore'}
            </button>
          ) : products.length === 0 ? (
            <button
              type="button"
              onClick={() => onNavigate('account')}
              className="min-h-[48px] px-6 rounded bg-[#a81825] text-white text-sm font-semibold hover:bg-[#820014] transition-colors"
            >
              Admin Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="min-h-[44px] px-5 rounded border border-[#e5e7eb] text-sm font-semibold text-[#202020] hover:bg-[#f8f9fa]"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
              onRequireAuth={() => onNavigate('account')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
