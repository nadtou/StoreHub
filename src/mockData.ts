import { Boutique, Product, Collection, UserRole } from './types';

export const mockBoutiques: Boutique[] = [
  {
    id: 'boutique_1',
    ownerId: 'owner_1',
    name: 'Atelier Noir',
    slug: 'atelier-noir',
    description: 'Parisian fashion house combining minimalist silhouettes, monochrome palettes, and absolute structural elegance. Designed for the modern intellectual.',
    logo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&h=600&fit=crop',
    location: {
      city: 'Paris',
      country: 'France',
      coordinates: { lat: 48.8566, lng: 2.3522 }
    },
    categories: ['Femme', 'Accessoires', 'Unisex'],
    tags: ['Minimaliste', 'Éco-responsable', 'Haute Couture'],
    social: {
      instagram: '@ateliernoir_paris',
      website: 'https://ateliernoir.com'
    },
    stats: {
      productsCount: 12,
      followersCount: 1240,
      viewsCount: 15420
    },
    isVerified: true,
    isFeatured: true,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z'
  },
  {
    id: 'boutique_2',
    ownerId: 'owner_2',
    name: 'Maison Dorée',
    slug: 'maison-doree',
    description: 'A tribute to light, fluidity, and exquisite materials. We specialize in Italian silks, warm gold jewelry accents, and sunny resort-wear essentials.',
    logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=200&h=200&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&h=600&fit=crop',
    location: {
      city: 'Milan',
      country: 'Italy',
      coordinates: { lat: 45.4642, lng: 9.1900 }
    },
    categories: ['Femme', 'Bijoux', 'Resort'],
    tags: ['Fluide', 'Soie', 'Luxe Chaud'],
    social: {
      instagram: '@maison_doree',
      website: 'https://maisondoree.it'
    },
    stats: {
      productsCount: 8,
      followersCount: 3102,
      viewsCount: 28900
    },
    isVerified: true,
    isFeatured: true,
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-06-22T14:00:00Z'
  },
  {
    id: 'boutique_3',
    ownerId: 'owner_3',
    name: 'Koben',
    slug: 'koben-scandi',
    description: 'Scandinavian technical craftsmanship meeting clean, avant-garde design. Structural wool coats, architectural knitwear, and premium modular accessories.',
    logo: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=200&h=200&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1200&h=600&fit=crop',
    location: {
      city: 'Copenhagen',
      country: 'Denmark',
      coordinates: { lat: 55.6761, lng: 12.5683 }
    },
    categories: ['Homme', 'Femme', ' outerwear'],
    tags: ['Technique', 'Laine', 'Avant-Garde'],
    social: {
      instagram: '@koben_architectural',
      website: 'https://koben.dk'
    },
    stats: {
      productsCount: 15,
      followersCount: 843,
      viewsCount: 9450
    },
    isVerified: false,
    isFeatured: false,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-06-18T16:00:00Z'
  }
];

export const mockProducts: Product[] = [
  {
    id: 'prod_1',
    boutiqueId: 'boutique_1',
    boutiqueName: 'Atelier Noir',
    boutiqueLogo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=100&h=100&fit=crop',
    name: 'Robe Soie Ivoire',
    description: 'An ethereal silk slip dress with a raw asymmetrical edge and delicate back detailing. Spun from premium Mulberry silk that drapes naturally like water.',
    price: 290,
    currency: 'DZD',
    images: [
      { url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&h=800&fit=crop', width: 600, height: 800, blurHash: 'L6Pj' },
      { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&h=800&fit=crop', width: 600, height: 800 }
    ],
    category: 'robes',
    subCategory: 'Robe longue',
    styles: ['Minimaliste', 'Élégant'],
    colors: ['Ivoire', 'Blanc'],
    sizes: ['XS', 'S', 'M', 'L'],
    materials: ['Mulberry Silk'],
    collection: 'Printemps 2026',
    tags: ['nouveauté', 'soie', 'tendance'],
    stats: { views: 342, favorites: 28, clicks: 56 },
    isAvailable: true,
    isFeatured: true,
    searchKeywords: ['robe', 'soie', 'ivoire', 'blanc', 'dress', 'silk'],
    createdAt: '2026-05-10T12:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z'
  },
  {
    id: 'prod_2',
    boutiqueId: 'boutique_1',
    boutiqueName: 'Atelier Noir',
    boutiqueLogo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=100&h=100&fit=crop',
    name: 'Trench Architectonique',
    description: 'Deconstructed duster jacket featuring broad structured shoulders and a contrasting matte black hardware waist belt. High wind resistance and tailored silhouette.',
    price: 420,
    currency: 'DZD',
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&h=800&fit=crop', width: 600, height: 800, blurHash: 'L3N_y1' }
    ],
    category: 'outerwear',
    subCategory: 'Trench coat',
    styles: ['Minimaliste', 'Avant-Garde'],
    colors: ['Noir Charbon'],
    sizes: ['S', 'M', 'L'],
    materials: ['Gabardine de coton enduit'],
    collection: 'Printemps 2026',
    tags: ['iconique', 'architectural'],
    stats: { views: 520, favorites: 47, clicks: 89 },
    isAvailable: true,
    isFeatured: true,
    searchKeywords: ['coat', 'trench', 'noir', 'charcoal', 'outerwear', 'veste'],
    createdAt: '2026-05-12T14:30:00Z',
    updatedAt: '2026-06-20T10:00:00Z'
  },
  {
    id: 'prod_3',
    boutiqueId: 'boutique_2',
    boutiqueName: 'Maison Dorée',
    boutiqueLogo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=100&h=100&fit=crop',
    name: 'Sautoir Cascade Solaire',
    description: 'A multi-layered fluid chain necklace forged from recycled solid brass and plated in 24k champagne gold. Catching every ray of sunlight with organic movement.',
    price: 180,
    currency: 'DZD',
    images: [
      { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&h=800&fit=crop', width: 600, height: 800 }
    ],
    category: 'bijoux',
    subCategory: 'Collier',
    styles: ['Élégant', 'Luxe Chaud'],
    colors: ['Or Doré'],
    sizes: ['Unique'],
    materials: ['24k Gold Plated Brass'],
    collection: 'Cruising Milan',
    tags: ['or', 'collier', 'solaire'],
    stats: { views: 189, favorites: 14, clicks: 32 },
    isAvailable: true,
    isFeatured: false,
    searchKeywords: ['necklace', 'gold', 'jewelry', 'collier', 'or', 'sautoir'],
    createdAt: '2026-05-15T09:00:00Z',
    updatedAt: '2026-06-21T14:00:00Z'
  },
  {
    id: 'prod_4',
    boutiqueId: 'boutique_2',
    boutiqueName: 'Maison Dorée',
    boutiqueLogo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=100&h=100&fit=crop',
    name: 'Caban en Lin Riviera',
    description: 'Breezy oversized double-breasted jacket made of heavyweight untreated natural flax linen. Perfectly pairs with sunset walks and maritime breezes.',
    price: 310,
    currency: 'DZD',
    images: [
      { url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&h=800&fit=crop', width: 600, height: 800 }
    ],
    category: 'outerwear',
    subCategory: 'Veste d\'été',
    styles: ['Fluide', 'Luxe Chaud'],
    colors: ['Sable', 'Beige Naturel'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    materials: ['100% Lin Belge'],
    collection: 'Cruising Milan',
    tags: ['lin', 'tendance', 'summer'],
    stats: { views: 401, favorites: 35, clicks: 71 },
    isAvailable: true,
    isFeatured: true,
    searchKeywords: ['linen', 'lin', 'beige', 'jacket', 'veste', 'summer', 'riviera'],
    createdAt: '2026-05-18T10:15:00Z',
    updatedAt: '2026-06-22T14:00:00Z'
  },
  {
    id: 'prod_5',
    boutiqueId: 'boutique_3',
    boutiqueName: 'Koben',
    boutiqueLogo: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=100&h=100&fit=crop',
    name: 'Pull Mérinos Structure',
    description: 'Heavy architectural knit sweater crafted from pure extrafine merino wool. Designed with an structured high neck collar and organic diagonal knitting patterns.',
    price: 245,
    currency: 'DZD',
    images: [
      { url: 'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=600&h=800&fit=crop', width: 600, height: 800 }
    ],
    category: 'hauts',
    subCategory: 'Pull',
    styles: ['Minimaliste', 'Avant-Garde'],
    colors: ['Gris Ciment', 'Anthracite'],
    sizes: ['S', 'M', 'L', 'XL'],
    materials: ['Extrafine Merino Wool'],
    collection: 'Nórdic Struct',
    tags: ['wool', 'knitwear', 'warm'],
    stats: { views: 280, favorites: 29, clicks: 42 },
    isAvailable: true,
    isFeatured: false,
    searchKeywords: ['sweater', 'pull', 'wool', 'merino', 'grey', 'scandi'],
    createdAt: '2026-05-20T11:00:00Z',
    updatedAt: '2026-06-18T16:00:00Z'
  },
  {
    id: 'prod_6',
    boutiqueId: 'boutique_3',
    boutiqueName: 'Koben',
    boutiqueLogo: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=100&h=100&fit=crop',
    name: 'Sac Messager Modulaire',
    description: 'Weatherproof heavy cotton canvas messenger bag with dynamic laser-cut magnetic snaps and Italian vegetable-tanned leather harnesses.',
    price: 360,
    currency: 'DZD',
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&h=800&fit=crop', width: 600, height: 800 }
    ],
    category: 'accessoires',
    subCategory: 'Sac',
    styles: ['Technique', 'Avant-Garde'],
    colors: ['Vert Olive', 'Noir'],
    sizes: ['Moyenne'],
    materials: ['Canvas Imperméable', 'Cuir Végétal'],
    collection: 'Nórdic Struct',
    tags: ['bag', 'modular', 'techwear'],
    stats: { views: 198, favorites: 22, clicks: 49 },
    isAvailable: true,
    isFeatured: true,
    searchKeywords: ['bag', 'sac', 'messenger', 'canvas', 'leather', 'olive'],
    createdAt: '2026-05-25T16:00:00Z',
    updatedAt: '2026-06-18T16:00:00Z'
  }
];

export const mockCollections: Collection[] = [
  {
    id: 'coll_1',
    boutiqueId: 'boutique_1',
    name: 'Printemps 2026 : Écorce & Soie',
    description: 'An exploration of tension between rugged tailoring and fragile mulberry silk underpinnings.',
    coverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&h=600&fit=crop',
    productIds: ['prod_1', 'prod_2'],
    isPublished: true,
    order: 1
  },
  {
    id: 'coll_2',
    boutiqueId: 'boutique_2',
    name: 'Cruising Milan',
    description: 'Capturing sunset golden light on the marble streets. Lightweight flow, linen, and pure warm metals.',
    coverImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&h=600&fit=crop',
    productIds: ['prod_3', 'prod_4'],
    isPublished: true,
    order: 2
  }
];

export interface StyleQuizQuestion {
  id: string;
  text: string;
  helper: string;
  selectionMode: 'single' | 'multiple';
  options: {
    value: string;
    label: string;
    description: string;
    image?: string;
    monogram?: string;
  }[];
}

export const styleQuiz: StyleQuizQuestion[] = [
  {
    id: 'audiences',
    text: 'Pour qui souhaitez-vous découvrir des articles ?',
    helper: 'Choisissez un seul univers pour personnaliser votre sélection.',
    selectionMode: 'single',
    options: [
      { value: 'Femme', label: 'Femme', description: 'Mode, chaussures et accessoires', monogram: 'F' },
      { value: 'Homme', label: 'Homme', description: 'Vêtements, chaussures et essentiels', monogram: 'H' },
      { value: 'Enfants', label: 'Enfant', description: 'Sélections pour filles et garçons', monogram: 'E' }
    ]
  },
  {
    id: 'styles',
    text: 'Quels styles vous ressemblent le plus ?',
    helper: 'Vous pouvez sélectionner plusieurs styles.',
    selectionMode: 'multiple',
    options: [
      { value: 'Minimaliste', label: 'Minimaliste', description: 'Lignes simples et tons sobres', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop' },
      { value: 'Élégant', label: 'Élégant', description: 'Pièces raffinées et intemporelles', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=600&auto=format&fit=crop' },
      { value: 'Streetwear', label: 'Streetwear', description: 'Silhouettes urbaines et actuelles', image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop' },
      { value: 'Sportif', label: 'Sportif', description: 'Confort, mouvement et technicité', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=600&auto=format&fit=crop' }
    ]
  },
  {
    id: 'favoriteCategories',
    text: 'Quels articles souhaitez-vous voir en priorité ?',
    helper: 'Sélectionnez une ou plusieurs catégories.',
    selectionMode: 'multiple',
    options: [
      { value: 'vetements', label: 'Vêtements', description: 'Hauts, robes et ensembles', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600&auto=format&fit=crop' },
      { value: 'chaussures', label: 'Chaussures', description: 'Baskets, souliers et bottes', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop' },
      { value: 'outerwear', label: 'Vestes & manteaux', description: 'Couches, vestes et pièces fortes', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop' },
      { value: 'accessoires', label: 'Accessoires', description: 'Sacs, bijoux et détails', image: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?q=80&w=600&auto=format&fit=crop' }
    ]
  }
];
