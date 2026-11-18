import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export const HERO_IMAGE_PATH = '/src/assets/images/stylah_hero_interior_1794993455269.jpg';
export const WALLPAPER_IMAGE_PATH = '/src/assets/images/product_wallpaper_linen_1794993455627.jpg';
export const MURAL_IMAGE_PATH = '/src/assets/images/product_mural_botanical_1794993455789.jpg';
export const CHANDELIER_IMAGE_PATH = '/src/assets/images/product_chandelier_brass_1794993456046.jpg';
export const CCTV_IMAGE_PATH = '/src/assets/images/product_cctv_smart_1794993456722.jpg';
export const SERVICE_IMAGE_PATH = '/src/assets/images/service_installation_team_1794993456980.jpg';

const STARTER_CATEGORIES = [
  {
    id: 'cat_wallpapers',
    name: 'Wallpapers',
    slug: 'wallpapers',
    type: 'both',
    description: 'Textured vinyl, woven linen, and geometric architectural wallpapers.',
    imageUrl: WALLPAPER_IMAGE_PATH,
    sortOrder: 1,
  },
  {
    id: 'cat_murals',
    name: 'Wall Murals',
    slug: 'wall-murals',
    type: 'both',
    description: 'Custom-sized botanical, travertine, and panoramic wall murals.',
    imageUrl: MURAL_IMAGE_PATH,
    sortOrder: 2,
  },
  {
    id: 'cat_lighting',
    name: 'Lighting & Chandeliers',
    slug: 'lighting-chandeliers',
    type: 'both',
    description: 'Architectural brass chandeliers, pendant rings, and recessed linear LED.',
    imageUrl: CHANDELIER_IMAGE_PATH,
    sortOrder: 3,
  },
  {
    id: 'cat_cctv',
    name: 'CCTV & Security',
    slug: 'cctv-security',
    type: 'both',
    description: '4K PoE IP cameras, NVR kits, smart intercoms, and access control.',
    imageUrl: CCTV_IMAGE_PATH,
    sortOrder: 4,
  },
  {
    id: 'cat_interior_decor',
    name: 'Interior & Exterior Decor',
    slug: 'interior-exterior-decor',
    type: 'both',
    description: 'Acoustic fluted slats, stone cladding, and architectural finishes.',
    imageUrl: SERVICE_IMAGE_PATH,
    sortOrder: 5,
  },
  {
    id: 'cat_electrical',
    name: 'Electrical & Accessories',
    slug: 'electrical-accessories',
    type: 'both',
    description: 'Smart switches, architectural sockets, and home/office power fittings.',
    imageUrl: HERO_IMAGE_PATH,
    sortOrder: 6,
  },
];

const STARTER_PRODUCTS = [
  {
    id: 'prod_haven_linen_wallpaper',
    name: 'Haven Woven Linen Architectural Wallpaper',
    slug: 'haven-woven-linen-wallpaper',
    description:
      'Heavyweight commercial-grade woven linen vinyl wallpaper engineered for East African humidity. Scrubbable matte finish ideal for living rooms, executive offices, and hotel suites.',
    categoryId: 'cat_wallpapers',
    categoryName: 'Wallpapers',
    priceKsh: 6800,
    discountedPriceKsh: 5900,
    stockQty: 42,
    availabilityStatus: 'in_stock',
    featured: true,
    imageUrls: [WALLPAPER_IMAGE_PATH],
    variations: ['Warm Sand (0.53m x 10m)', 'Stone Taupe (0.53m x 10m)', 'Ivory Weave (0.53m x 10m)'],
    specifications: [
      'Roll Coverage: 5.3 sqm per standard roll',
      'Substrate: Non-woven breathable backing',
      'Washability: Extra washable & UV fade resistant',
    ],
    searchKeywords: ['wallpaper', 'linen', 'kenya', 'living room', 'interior'],
  },
  {
    id: 'prod_savannah_botanical_mural',
    name: 'Botanical Silhouette Custom Wall Mural',
    slug: 'botanical-silhouette-wall-mural',
    description:
      'Seamless wide-format matte canvas wall mural printed with eco-solvent architectural inks. Supplied numbered in panels for invisible-joint installation.',
    categoryId: 'cat_murals',
    categoryName: 'Wall Murals',
    priceKsh: 18500,
    stockQty: 18,
    availabilityStatus: 'in_stock',
    featured: true,
    imageUrls: [MURAL_IMAGE_PATH],
    variations: ['3.0m x 2.6m Standard Wall', '4.2m x 2.8m Feature Wall', 'Custom Dimension Cut'],
    specifications: [
      'Material: 320gsm Textured Non-Woven Fleece',
      'Finish: Anti-glare architectural matte',
      'Installation: Paste-the-wall dry strip',
    ],
    searchKeywords: ['wall mural', 'botanical', 'feature wall', 'kenya'],
  },
  {
    id: 'prod_aurelia_brass_chandelier',
    name: 'Aurelia Multi-Ring Brushed Brass Chandelier',
    slug: 'aurelia-brass-ring-chandelier',
    description:
      'Suspended sculptural multi-ring LED chandelier crafted in brushed antique brass with frosted alabaster acrylic diffusers. Ideal for double-volume stairwells and dining rooms.',
    categoryId: 'cat_lighting',
    categoryName: 'Lighting & Chandeliers',
    priceKsh: 64500,
    discountedPriceKsh: 58900,
    stockQty: 7,
    availabilityStatus: 'low_stock',
    featured: true,
    imageUrls: [CHANDELIER_IMAGE_PATH],
    variations: ['3-Ring Warm 3000K', '5-Ring Stairwell Drop (Warm 3000K)', 'Dimmable Tri-Tone'],
    specifications: [
      'Power: 78W High-CRI Integrated LED (220-240V)',
      'Suspension Drop: Adjustable up to 2.5m',
      'Warranty: 24-month driver & LED warranty',
    ],
    searchKeywords: ['chandelier', 'brass', 'lighting', 'stairwell', 'kenya'],
  },
  {
    id: 'prod_sentinel_4k_cctv_kit',
    name: 'Sentinel 4K AI Turret CCTV & Smart Keypad Kit',
    slug: 'sentinel-4k-ai-cctv-kit',
    description:
      '4-channel 4K PoE IP surveillance kit with human/vehicle AI motion alerts, full-color night vision, 2TB surveillance drive, and mobile remote viewing.',
    categoryId: 'cat_cctv',
    categoryName: 'CCTV & Security',
    priceKsh: 48500,
    stockQty: 14,
    availabilityStatus: 'in_stock',
    featured: true,
    imageUrls: [CCTV_IMAGE_PATH],
    variations: ['4-Camera 2TB Kit', '8-Camera 4TB Kit', 'Single Add-On 4K Turret'],
    specifications: [
      'Resolution: 8MP 4K UHD @ 25fps',
      'Weather Rating: IP67 Outdoor Aluminium Housing',
      'Connectivity: PoE IEEE 802.3af + Mobile App Push',
    ],
    searchKeywords: ['cctv', 'security', 'camera', '4k', 'kenya'],
  },
  {
    id: 'prod_fluted_oak_acoustic_panel',
    name: 'Fluted Natural Oak Acoustic Wall Slat Panel',
    slug: 'fluted-oak-acoustic-wall-panel',
    description:
      'Architectural timber slat panels bonded onto sound-absorbing dark acoustic felt. Designed for TV media walls, boardrooms, and bedrooms.',
    categoryId: 'cat_interior_decor',
    categoryName: 'Interior & Exterior Decor',
    priceKsh: 9200,
    stockQty: 65,
    availabilityStatus: 'in_stock',
    featured: false,
    imageUrls: [SERVICE_IMAGE_PATH],
    variations: ['2400mm x 600mm (Natural Oak)', '2400mm x 600mm (Smoked Walnut)'],
    specifications: [
      'Coverage: 1.44 sqm per panel',
      'Thickness: 21mm total depth',
      'Acoustic Rating: NRC 0.85 sound absorption',
    ],
    searchKeywords: ['acoustic', 'fluted', 'wall panel', 'interior decor'],
  },
  {
    id: 'prod_travertine_wall_mural',
    name: 'Travertine Stone Texture Panoramic Mural',
    slug: 'travertine-stone-panoramic-mural',
    description:
      'Architectural stone-vein mural offering natural travertine warmth without structural slab weight.',
    categoryId: 'cat_murals',
    categoryName: 'Wall Murals',
    priceKsh: 21000,
    stockQty: 12,
    availabilityStatus: 'in_stock',
    featured: false,
    imageUrls: [HERO_IMAGE_PATH],
    variations: ['3.6m x 2.7m Wide Format', 'Custom Wall Dimension'],
    specifications: [
      'Texture: Embossed mineral matte',
      'Moisture Resistance: Wipeable vinyl-coated fleece',
    ],
    searchKeywords: ['travertine', 'mural', 'stone', 'living room'],
  },
];

const STARTER_SERVICES = [
  {
    id: 'svc_wallpaper_install',
    title: 'Precision Wallpaper & Wall Mural Installation',
    slug: 'wallpaper-mural-installation',
    description:
      'Laser-leveled surface preparation, primer sealing, and seam-matched installation for residential and commercial wallpapers and wide-format murals across Kenya.',
    category: 'Wallpapers & Murals',
    benefits: [
      'Laser-aligned pattern matching and invisible seams',
      'Anti-fungal primer prep for Kenyan coastal and highland climates',
      'Clean site handover within 1 business day for standard rooms',
    ],
    estimatedPriceKsh: 1800,
    priceUnit: 'per roll installed',
    available: true,
    bookingInstructions: 'Share wall width/height in metres and attach photos of the current wall surface.',
    imageUrls: [WALLPAPER_IMAGE_PATH, MURAL_IMAGE_PATH],
  },
  {
    id: 'svc_interior_decor',
    title: 'Bespoke Interior Decoration & Fluted Paneling',
    slug: 'interior-decoration-paneling',
    description:
      'Full feature-wall styling, acoustic slat cladding, gypsum cove integration, and interior material curation tailored for apartments, villas, and offices.',
    category: 'Interior Decoration',
    benefits: [
      'On-site measurement and material sample inspection',
      'Integrated concealed LED channels and TV media wall framing',
      'Dedicated project supervisor from quotation to handover',
    ],
    estimatedPriceKsh: 15000,
    priceUnit: 'starting consultation & scope',
    available: true,
    bookingInstructions: 'Upload room photos and indicate your preferred installation timeline.',
    imageUrls: [SERVICE_IMAGE_PATH, HERO_IMAGE_PATH],
  },
  {
    id: 'svc_lighting_chandelier',
    title: 'Chandelier & Architectural Lighting Installation',
    slug: 'chandelier-lighting-installation',
    description:
      'Safe structural anchoring, scaffolding rigging for double-volume ceilings, smart dimmer wiring, and recessed linear lighting installation by licensed technicians.',
    category: 'Lighting & Electrical',
    benefits: [
      'Reinforced ceiling bracket anchoring for heavy brass/crystal fixtures',
      'Clean concealed cabling and smart dimmer calibration',
      'Full electrical load testing and safety sign-off',
    ],
    estimatedPriceKsh: 6500,
    priceUnit: 'per fixture installation',
    available: true,
    bookingInstructions: 'Specify ceiling height (standard or double-volume) and fixture weight if known.',
    imageUrls: [CHANDELIER_IMAGE_PATH],
  },
  {
    id: 'svc_cctv_security',
    title: 'CCTV Surveillance & Smart Security Installation',
    slug: 'cctv-security-installation',
    description:
      'Structured Cat6 cabling, PoE camera mounting, NVR storage configuration, smart intercom setup, and mobile remote-view handover for homes and commercial premises.',
    category: 'CCTV & Security',
    benefits: [
      'Clean concealed conduit routing with zero exposed messy cables',
      'Mobile app remote viewing configured on Android and iOS',
      'Backup UPS power sizing guidance for uninterrupted recording',
    ],
    estimatedPriceKsh: 12500,
    priceUnit: 'installation & configuration',
    available: true,
    bookingInstructions: 'Indicate number of entry points, perimeter walls, or floors requiring coverage.',
    imageUrls: [CCTV_IMAGE_PATH],
  },
];

const STARTER_PORTFOLIO = [
  {
    id: 'proj_demo_living_lounge',
    title: 'Demonstration Showcase: Contemporary Travertine & Fluted Oak Lounge',
    slug: 'demo-travertine-fluted-oak-lounge',
    category: 'Interior Decoration',
    location: 'Demonstration Concept · Kenya',
    description:
      'Demonstration showcase illustrating combined travertine panoramic mural application, vertical oak acoustic slats, recessed warm LED cove lighting, and a brushed brass focal chandelier.',
    imageUrls: [HERO_IMAGE_PATH, SERVICE_IMAGE_PATH],
    completionDate: 'Demonstration Entry',
    featured: true,
    isDemo: true,
  },
  {
    id: 'proj_demo_stairwell_lighting',
    title: 'Demonstration Showcase: Double-Volume Alabaster Ring Chandelier',
    slug: 'demo-double-volume-stairwell-chandelier',
    category: 'Lighting & Chandeliers',
    location: 'Demonstration Concept · Kenya',
    description:
      'Demonstration showcase featuring multi-ring brushed brass chandelier rigging in a curved architectural plaster stairwell with warm 3000K illumination.',
    imageUrls: [CHANDELIER_IMAGE_PATH],
    completionDate: 'Demonstration Entry',
    featured: true,
    isDemo: true,
  },
  {
    id: 'proj_demo_botanical_dining',
    title: 'Demonstration Showcase: Botanical Feature Wall & Smart Security',
    slug: 'demo-botanical-mural-smart-security',
    category: 'Wall Murals & CCTV',
    location: 'Demonstration Concept · Kenya',
    description:
      'Demonstration showcase pairing a seamless botanical silhouette wall mural with discrete exterior 4K PoE turret CCTV and architectural keypad integration.',
    imageUrls: [MURAL_IMAGE_PATH, CCTV_IMAGE_PATH],
    completionDate: 'Demonstration Entry',
    featured: false,
    isDemo: true,
  },
];

export async function seedStarterFirestoreData(actorUid?: string, actorEmail?: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const cat of STARTER_CATEGORIES) {
      batch.set(doc(db, 'categories', cat.id), {
        ...cat,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const prod of STARTER_PRODUCTS) {
      batch.set(doc(db, 'products', prod.id), {
        ...prod,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const svc of STARTER_SERVICES) {
      batch.set(doc(db, 'services', svc.id), {
        ...svc,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const proj of STARTER_PORTFOLIO) {
      batch.set(doc(db, 'projects', proj.id), {
        ...proj,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(
      doc(db, 'settings', 'public'),
      {
        businessName: 'Stylah Designs & Interiors',
        tagline: 'Transforming Walls, Elevating Spaces.',
        logoUrl: '/assets/aistudio/STYLAH_LOGO_788598bc.jpeg',
        announcementText: '',
        announcementActive: false,
        heroKicker: 'Stylah Designs & Interiors · Kenya',
        heroHeadline: 'Architectural Wallpapers, Chandeliers & Smart Security',
        heroSubtitle:
          'Transforming Walls, Elevating Spaces. Curated wall murals, luxury interior lighting, and 4K CCTV surveillance systems supplied across Kenya with certified on-site installation.',
        heroImageUrl: HERO_IMAGE_PATH,
        heroPrimaryCta: 'Shop Products',
        heroSecondaryCta: 'Book Installation',
        whatsappNumber: '254745280011',
        supportEmail: 'stylahindustries297@gmail.com',
        showroomLocation: '',
        facebookUrl: '',
        instagramUrl: '',
        tiktokUrl: '',
        standardDeliveryFeeKsh: 650,
        freeDeliveryThresholdKsh: 25000,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(doc(db, 'promotions', 'promo_welcome10'), {
      code: 'STYLAH10',
      title: '10% Welcome Interior & Finish Offer',
      discountPercent: 10,
      published: true,
      updatedAt: serverTimestamp(),
    });

    if (actorUid && actorEmail) {
      batch.set(doc(db, 'auditLogs', `seed_${Date.now()}`), {
        actorId: actorUid,
        actorEmail,
        action: 'SEED_STARTER_CATALOG',
        targetCollection: 'products,services,projects,categories,promotions',
        targetId: 'batch_seed',
        summary: 'Published editable starter products, installation services, promotions, and demonstration portfolio items.',
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedStarterFirestoreData');
  }
}
