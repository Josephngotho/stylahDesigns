import { Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SmartImage } from '../components/SmartImage';
import { useStore } from '../context/StoreContext';
import { applySeoMeta } from '../lib/seo';
import { AppTab, PortfolioProject } from '../types/stylah';

interface PortfolioViewProps {
  onNavigate: (tab: AppTab) => void;
}

export function PortfolioView({ onNavigate }: PortfolioViewProps) {
  const { projects, catalogLoading } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);

  useEffect(() => {
    applySeoMeta({
      title: 'Interior Design & Lighting Portfolio Kenya | Stylah Designs & Interiors',
      description:
        'Explore residential and commercial interior finishing, wall murals, architectural lighting, and smart security installations.',
      path: '/portfolio',
    });
  }, []);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((p) => p.category)))],
    [projects]
  );

  const filtered = useMemo(
    () =>
      selectedCategory === 'all'
        ? projects
        : projects.filter((p) => p.category === selectedCategory),
    [projects, selectedCategory]
  );

  const hasDemoItems = filtered.some((p) => p.isDemo);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-[#202020]">
            Portfolio &amp; Spatial Concepts
          </h1>
          <p className="text-sm text-[#5a403f] mt-1">
            Curated interior finishes, chandeliers, and technical integration showcases.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('services')}
          className="min-h-[44px] px-5 rounded bg-[#a81825] text-white text-xs font-semibold hover:bg-[#820014] whitespace-nowrap shrink-0"
        >
          Request Similar Scope
        </button>
      </div>

      {hasDemoItems && (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 flex items-start gap-3 text-xs text-[#5a403f]">
          <Info className="w-4 h-4 text-[#a81825] shrink-0 mt-0.5" />
          <p>
            Entries labeled <strong>Demonstration Showcase</strong> represent concept visualisations provided until Stylah uploads client-completed site photography in the Admin Dashboard.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
              selectedCategory === cat
                ? 'bg-[#a81825] text-white'
                : 'bg-[#f5f5f5] text-[#202020] hover:bg-[#eae7e7]'
            }`}
          >
            {cat === 'all' ? 'All Projects' : cat}
          </button>
        ))}
      </div>

      {catalogLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 bg-white border border-[#e5e7eb] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-10 text-center text-sm text-[#5a403f]">
          No published portfolio projects yet. Administrators can publish projects from the Admin Dashboard.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => (
            <article
              key={proj.id}
              onClick={() => setActiveProject(proj)}
              className="cursor-pointer bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-level-1 hover:shadow-level-2 transition-shadow flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#f8f9fa]">
                <SmartImage src={proj.imageUrls[0]} alt={proj.title} fallbackTitle={proj.title} />
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#6b7280]">
                    {proj.category}
                    {proj.isDemo ? ' · Demonstration Showcase' : ''}
                  </p>
                  <h2 className="font-display text-base font-semibold text-[#202020] mt-1">
                    {proj.title}
                  </h2>
                  <p className="text-xs text-[#5a403f] mt-1 line-clamp-2">{proj.description}</p>
                </div>
                <p className="text-xs font-medium text-[#202020] pt-2 border-t border-[#f0eded]">
                  {proj.location || 'Kenya'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeProject && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveProject(null)}
        >
          <div
            className="max-w-3xl w-full bg-white rounded-lg overflow-hidden shadow-level-2 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#6b7280]">
                  {activeProject.category}
                  {activeProject.isDemo ? ' · Demonstration Showcase' : ''}
                </p>
                <h3 className="font-display text-lg font-semibold text-[#202020]">
                  {activeProject.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close project details"
                onClick={() => setActiveProject(null)}
                className="w-11 h-11 rounded border border-[#e5e7eb] flex items-center justify-center hover:bg-[#f8f9fa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProject.imageUrls.map((img, i) => (
                  <div key={i} className="aspect-[4/3] rounded overflow-hidden bg-[#f8f9fa] border border-[#e5e7eb]">
                    <SmartImage src={img} alt={`${activeProject.title} ${i + 1}`} />
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#5a403f] leading-relaxed">{activeProject.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
