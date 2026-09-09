export enum UserRole {
  CLIENT = 'client',
  BOUTIQUE = 'boutique',
  GUEST = 'guest',
  ADMIN = 'admin'
}

export interface UserPreferences {
  audiences?: string[];
  styles: string[];
  sizes: string[];
  favoriteCategories: string[];
}

export interface UserStats {
  favoritesCount: number;
  viewedProducts: number;
}

export type AccountApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: string;
  city?: string;
  preferences?: UserPreferences;
  stats?: UserStats;
  followedBoutiqueIds?: string[];
  favoriteProductIds?: string[];
  boutiqueId?: string;
  accountStatus?: AccountApprovalStatus;
  approvalSubmittedAt?: string;
  approvalReviewedAt?: string;
  approvalRejectionReason?: string;
}

export interface LocationInfo {
  city: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface BoutiqueStats {
  productsCount: number;
  followersCount: number;
  viewsCount: number;
}

export type BoutiqueVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface Boutique {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  location: LocationInfo;
  categories: string[];
  tags: string[];
  social: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    website?: string;
  };
  stats: BoutiqueStats;
  isVerified: boolean;
  isFeatured: boolean;
  isSuspended?: boolean;
  verificationStatus?: BoutiqueVerificationStatus;
  verificationDocName?: string;
  verificationDocPath?: string;
  verificationSubmittedAt?: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoutiqueApplication {
  boutiqueId: string;
  ownerId: string;
  status: BoutiqueVerificationStatus;
  verificationDocName: string;
  verificationDocPath: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface ProductImage {
  url: string;
  width: number;
  height: number;
  blurHash?: string;
}

export interface ProductStats {
  views: number;
  favorites: number;
  clicks: number;
}

export interface Product {
  id: string;
  boutiqueId: string;
  boutiqueName: string;
  boutiqueLogo: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: ProductImage[];
  category: string;
  subCategory?: string;
  styles: string[];
  colors: string[];
  sizes: string[];
  shoeSizeMin?: number;
  shoeSizeMax?: number;
  stock?: number;
  sku?: string;
  alertLowStock?: boolean;
  lowStockThreshold?: number;
  materials: string[];
  collection?: string;
  tags: string[];
  stats: ProductStats;
  isAvailable: boolean;
  isFeatured: boolean;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteItem {
  productId: string;
  boutiqueId: string;
  snapshot: {
    name: string;
    image: string;
    price: number;
    boutiqueName: string;
  };
  addedAt: string;
}

export interface Collection {
  id: string;
  boutiqueId: string;
  name: string;
  description: string;
  coverImage: string;
  productIds: string[];
  isPublished: boolean;
  order: number;
}

export interface Message {
  id: string;
  sender: 'user' | 'stylist';
  text: string;
  timestamp: string;
  suggestions?: Product[];
}

export type OrderStatus = 'en_cours' | 'en_attente' | 'livre';

export interface ManualOrder {
  id: string;
  clientName: string;
  deliveryDate?: string;
  description?: string;
  amount?: string;
  status: OrderStatus;
  createdAt: string;
  boutiqueId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  clientId?: string;
  clientEmail?: string;
  selectedSize?: string;
  selectedColor?: string;
  source?: 'manual' | 'reservation';
}

export interface VisibilityPoint {
  date: string;
  boutiqueViews: number;
  productViews: number;
}
