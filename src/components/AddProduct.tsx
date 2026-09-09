import React, { useState } from 'react';
import { Product } from '../types';
import { ArrowLeft, Check, Upload, X, Plus, AlertCircle, Sparkles, Tag, Layers, Package, Globe } from 'lucide-react';
import {
  ensureRequiredClothingSizes,
  generateShoeSizes,
  getShoeSizeError,
  SHOE_SIZE_MAX,
  SHOE_SIZE_MIN,
} from '../utils/productSizes';
import { compressImageToWebP } from '../utils/imageCompression';

interface AddProductProps {
  onBack: () => void;
  onSuccess: (newProduct: Partial<Product>) => void;
  initialProduct?: Product | null;
}

interface UploadedMedia {
  url: string;
  width: number;
  height: number;
}

interface PresetColor {
  name: string;
  hex: string;
  border?: boolean;
}

const PALETTES: Record<string, PresetColor[]> = {
  'Intemporels': [
    { name: 'Noir Charbon', hex: '#1C1C1C' },
    { name: 'Blanc Pur', hex: '#FAFAFA', border: true },
    { name: 'Gris Anthracite', hex: '#4A4A4A' },
    { name: 'Bleu Marine', hex: '#0D1B2A' },
    { name: 'Beige Sable', hex: '#D2B48C' },
    { name: 'Brun Chocolat', hex: '#3E2723' },
    { name: 'Blanc Ivoire', hex: '#FFFFF0', border: true },
    { name: 'Gris Perle', hex: '#EAEAEA', border: true },
  ],
  'Tons Chauds': [
    { name: 'Rouge Bordeaux', hex: '#6B1124' },
    { name: 'Orange Terracotta', hex: '#C15C3D' },
    { name: 'Jaune Or', hex: '#D4AF37' },
    { name: 'Cognac', hex: '#9A461E' },
    { name: 'Moutarde', hex: '#E1AD01' },
    { name: 'Rouge Carmin', hex: '#960018' },
    { name: 'Prune', hex: '#4E0E2E' },
    { name: 'Rouille', hex: '#B7410E' },
  ],
  'Tons Froids': [
    { name: 'Vert Sauge', hex: '#9FAF90' },
    { name: 'Vert Kaki', hex: '#5E6B54' },
    { name: 'Vert Émeraude', hex: '#046307' },
    { name: 'Bleu Canard', hex: '#004B49' },
    { name: 'Bleu Indigo', hex: '#3F00FF' },
    { name: 'Vert Forêt', hex: '#228B22' },
    { name: 'Bleu Cobalt', hex: '#0047AB' },
    { name: 'Eucalyptus', hex: '#5F8575' },
  ],
  'Pastels & Doux': [
    { name: 'Rose Poudré', hex: '#F7C6C7', border: true },
    { name: 'Bleu Ciel', hex: '#87CEEB', border: true },
    { name: 'Lilas', hex: '#D6CADD', border: true },
    { name: 'Menthe Douce', hex: '#AAF0D1', border: true },
    { name: 'Pêche', hex: '#FFDAB9', border: true },
    { name: 'Jaune Beurre', hex: '#FFFDD0', border: true },
    { name: 'Vert d\'Eau', hex: '#C1FFC1', border: true },
    { name: 'Crème', hex: '#FDF5E6', border: true },
  ]
};

const ART_PENCILS = [
  { name: 'Noir Fusain', hex: '#1C1C1C' },
  { name: 'Blanc Craie', hex: '#F9F6EE', border: true },
  { name: 'Sanguine', hex: '#9E3E2F' },
  { name: 'Ocre d\'Or', hex: '#C29B38' },
  { name: 'Vert Céladon', hex: '#A3B899' },
  { name: 'Bleu Outremer', hex: '#0B3C5D' },
  { name: 'Brun Sépia', hex: '#4B3621' },
  { name: 'Gris Mine', hex: '#708090' },
  { name: 'Brique Rose', hex: '#C15C3D' },
  { name: 'Indigo Sourd', hex: '#2A3439' },
];

const COLOR_MAP: Record<string, { hex: string; border?: boolean }> = {};
Object.entries(PALETTES).forEach(([_, list]) => {
  list.forEach(c => {
    COLOR_MAP[c.name] = { hex: c.hex, border: c.border };
  });
});
ART_PENCILS.forEach(c => {
  COLOR_MAP[c.name] = { hex: c.hex, border: c.border };
});

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const rh = clamp(r).toString(16).padStart(2, '0');
  const gh = clamp(g).toString(16).padStart(2, '0');
  const bh = clamp(b).toString(16).padStart(2, '0');
  return `#${rh}${gh}${bh}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  
  let v = max;
  let s = max !== 0 ? delta / max : 0;
  let h = 0;
  
  if (delta !== 0) {
    if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else {
      h = 4 + (r - g) / delta;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  
  return { h, s: s * 100, v: v * 100 };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

interface ColorSliderProps {
  label: string;
  value: number;
  max: number;
  gradient: string;
  onChange: (val: number) => void;
}

function ColorSlider({ label, value, max, gradient, onChange }: ColorSliderProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleDrag = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    onChange(pct * max);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    handleDrag(e.clientX);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleDrag(moveEvent.clientX);
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handleDrag(e.touches[0].clientX);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      handleDrag(moveEvent.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const percentage = (value / max) * 100;

  return (
    <div className="space-y-0.5 w-full">
      <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 select-none">
        <span className="font-bold uppercase tracking-wider">{label}</span>
        <span className="font-semibold">{Math.round(value)}</span>
      </div>
      <div 
        ref={containerRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="relative h-1.5 w-full rounded-full cursor-pointer select-none touch-none shadow-inner border border-zinc-200/20"
        style={{ background: gradient }}
      >
        <div 
          className="absolute w-4 h-4 bg-white rounded-full shadow-sm border border-zinc-300/60 pointer-events-none transition-transform active:scale-110"
          style={{
            left: `${percentage}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>
    </div>
  );
}

export default function AddProduct({ onBack, onSuccess, initialProduct = null }: AddProductProps) {
  const isEditing = Boolean(initialProduct);
  const [name, setName] = useState(initialProduct?.name ?? '');
  const [price, setPrice] = useState(initialProduct ? String(initialProduct.price) : '');
  const [promoPrice, setPromoPrice] = useState('');
  const [description, setDescription] = useState(initialProduct?.description ?? '');
  const [category, setCategory] = useState(initialProduct?.category ?? 'robes');
  const [brand, setBrand] = useState('');
  const [gender, setGender] = useState('');
  
  // Inventory fields
  const [stock, setStock] = useState(String(initialProduct?.stock ?? 10));
  const [sku, setSku] = useState(initialProduct?.sku ?? '');
  const [alertLowStock, setAlertLowStock] = useState(initialProduct?.alertLowStock ?? false);
  const [lowStockThreshold, setLowStockThreshold] = useState(String(initialProduct?.lowStockThreshold ?? 5));

  // Custom specifications arrays
  const [sizes, setSizes] = useState<string[]>(() => (
    initialProduct?.sizes.length ? initialProduct.sizes : ['M', 'L', 'XL', 'XXL']
  ));
  const [shoeSizeMin, setShoeSizeMin] = useState(String(initialProduct?.shoeSizeMin ?? 36));
  const [shoeSizeMax, setShoeSizeMax] = useState(String(initialProduct?.shoeSizeMax ?? 45));
  const [colors, setColors] = useState<string[]>(initialProduct?.colors ?? []);
  const [materials, setMaterials] = useState<string[]>(initialProduct?.materials ?? ['Soie 100%']);
  
  // Media uploads
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mediaError, setMediaError] = useState('');

  // Delivery & Visibility fields
  const [weight, setWeight] = useState('0.5');
  const [shippingFee, setShippingFee] = useState('Standard');
  const [publishStatus, setPublishStatus] = useState<'immediate' | 'draft'>(
    initialProduct?.isAvailable ? 'immediate' : 'draft',
  );

  // Input states for adding new variants inline
  const [newColor, setNewColor] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#C5A850');
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [activePaletteTab, setActivePaletteTab] = useState<string>('Intemporels');

  // Custom Color Picker States matching user's image (HSV Sliders)
  const [hsv, setHsv] = useState({ h: 45, s: 59, v: 77 }); // #C5A850
  
  const [newSize, setNewSize] = useState('');
  const [isAddingSize, setIsAddingSize] = useState(false);

  const [newMaterial, setNewMaterial] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Default size choices matching luxury collections
  const [sizeOptions, setSizeOptions] = useState(() => Array.from(new Set([
    'XS', 'S', 'M', 'L', 'XL', 'XXL', ...(initialProduct?.sizes ?? []),
  ])));

  const isShoeProduct = category === 'chaussures';
  const shoeSizeMinValue = Number(shoeSizeMin);
  const shoeSizeMaxValue = Number(shoeSizeMax);
  const shoeSizeError = isShoeProduct ? getShoeSizeError(shoeSizeMinValue, shoeSizeMaxValue) : null;
  const generatedShoeSizes = isShoeProduct && !shoeSizeError
    ? generateShoeSizes(shoeSizeMinValue, shoeSizeMaxValue)
    : [];

  const handleHueChange = (newH: number) => {
    const updatedHsv = { ...hsv, h: newH };
    setHsv(updatedHsv);
    setCustomColorHex(hsvToHex(updatedHsv.h, updatedHsv.s, updatedHsv.v));
  };

  const handleSaturationChange = (newS: number) => {
    const updatedHsv = { ...hsv, s: newS };
    setHsv(updatedHsv);
    setCustomColorHex(hsvToHex(updatedHsv.h, updatedHsv.s, updatedHsv.v));
  };

  const handleValueChange = (newV: number) => {
    const updatedHsv = { ...hsv, v: newV };
    setHsv(updatedHsv);
    setCustomColorHex(hsvToHex(updatedHsv.h, updatedHsv.s, updatedHsv.v));
  };

  const handleRgbChange = (key: 'r' | 'g' | 'b', val: number) => {
    const rgb = hexToRgb(customColorHex);
    rgb[key] = val;
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setCustomColorHex(newHex);
    setHsv(hexToHsv(newHex));
  };

  const handleHexInputChange = (hex: string) => {
    let formatted = hex;
    if (!formatted.startsWith('#')) {
      formatted = '#' + formatted;
    }
    setCustomColorHex(formatted);
    if (formatted.length === 4 || formatted.length === 7) {
      setHsv(hexToHsv(formatted));
    }
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      const trimmed = newColor.trim();
      if (!colors.includes(trimmed)) {
        setColors(prev => [...prev, trimmed]);
        setCustomColors(prev => ({ ...prev, [trimmed]: customColorHex }));
      }
      setNewColor('');
      setIsAddingColor(false);
    }
  };

  const handleTogglePresetColor = (preset: { name: string; hex: string }) => {
    setColors(prev => {
      if (prev.includes(preset.name)) {
        return prev.filter(c => c !== preset.name);
      } else {
        return [...prev, preset.name];
      }
    });
  };

  const handleAddSize = () => {
    if (newSize.trim()) {
      const trimmed = newSize.trim().toUpperCase();
      if (!sizeOptions.includes(trimmed)) {
        setSizeOptions(prev => [...prev, trimmed]);
      }
      if (!sizes.includes(trimmed)) {
        setSizes(prev => [...prev, trimmed]);
      }
      setNewSize('');
      setIsAddingSize(false);
    }
  };

  const handleAddMaterial = () => {
    if (newMaterial.trim()) {
      const trimmed = newMaterial.trim();
      if (!materials.includes(trimmed)) {
        setMaterials(prev => [...prev, trimmed]);
      }
      setNewMaterial('');
      setIsAddingMaterial(false);
    }
  };

  const handleSizeToggle = (size: string) => {
    if (size === 'XL' || size === 'XXL') return;
    setSizes(prev => {
      if (prev.includes(size)) {
        return prev.filter(s => s !== size);
      }
      return [...prev, size];
    });
  };

  const prepareMediaFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    setMediaError(imageFiles.length === files.length ? '' : 'Seules les images sont autorisées.');
    const prepared = await Promise.all(imageFiles.map(async (file) => {
      const image = await compressImageToWebP(file);
      return { url: image.dataUrl, width: image.width, height: image.height };
    }));
    setUploadedMedia((current) => [...current, ...prepared]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files) as File[];
    e.target.value = '';
    try {
      await prepareMediaFiles(filesArray);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Impossible de préparer les images.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!e.dataTransfer.files) return;
    try {
      await prepareMediaFiles(Array.from(e.dataTransfer.files) as File[]);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Impossible de préparer les images.');
    }
  };

  const removeMedia = (indexToRemove: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isShoeProduct && shoeSizeError) return;

    // Map uploaded media URLs or fallback if none uploaded
    const finalImages = uploadedMedia.length > 0
      ? uploadedMedia.map((media) => ({ url: media.url, width: media.width, height: media.height }))
      : initialProduct?.images.length
        ? initialProduct.images
        : [{ url: "/images/default-fashion-cover-v2.png", width: 600, height: 800 }];

    const preservedTags = (initialProduct?.tags ?? []).filter((tag) => tag !== 'brouillon');
    const updatedTags = [
      ...preservedTags,
      brand,
      gender,
      isEditing ? '' : category,
      publishStatus === 'draft' ? 'brouillon' : '',
    ].filter(Boolean);

    const productDraft: Partial<Product> = {
      name: name || "Nouvelle création",
      price: Number(price) || 120,
      description: description || "Aucune description fournie.",
      category,
      sizes: isShoeProduct
        ? generatedShoeSizes
        : ensureRequiredClothingSizes(sizes.length > 0 ? sizes : ['M'], category),
      shoeSizeMin: isShoeProduct ? shoeSizeMinValue : undefined,
      shoeSizeMax: isShoeProduct ? shoeSizeMaxValue : undefined,
      stock: Math.max(0, Math.floor(Number(stock) || 0)),
      sku: sku.trim(),
      alertLowStock,
      lowStockThreshold: alertLowStock
        ? Math.max(0, Math.floor(Number(lowStockThreshold) || 0))
        : undefined,
      colors: colors.length > 0 ? colors : ['Blanc Pur'],
      materials: materials.length > 0 ? materials : ['Coton Premium'],
      images: finalImages,
      isAvailable: publishStatus === 'immediate' && Number(stock) > 0,
      tags: Array.from(new Set(updatedTags)),
      stats: initialProduct?.stats ?? { views: 0, favorites: 0, clicks: 0 }
    };

    onSuccess(productDraft);
  };

  const categoryOptions = [
    { value: 'tshirts', label: 'T-Shirts' },
    { value: 'pantalons', label: 'Pantalons' },
    { value: 'robes', label: 'Robes' },
    { value: 'vestes', label: 'Vestes' },
    { value: 'accessoires', label: 'Accessoires' },
    { value: 'chaussures', label: 'Chaussures' }
  ];

  return (
    <div className="relative w-full min-h-full shrink-0 bg-[#F4EFE6] text-[#111111] flex flex-col selection:bg-[#C5A850] selection:text-black font-sans">
      
      {/* 1. Stationary Sticky Header (Strict Alignment, No Shifting) */}
      <header className="sticky top-0 w-full h-auto shrink-0 flex items-center justify-center border-b border-[#E3DDD0]/80 bg-[#F4EFE6] select-none z-40 pt-[45px] pb-3.5">
        <button 
          type="button"
          onClick={onBack}
          className="absolute left-6 flex items-center gap-1.5 text-[10px] tracking-[0.2em] font-mono text-zinc-600 hover:text-black transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>RETOUR</span>
        </button>
        
        <div className="text-center">
          <h3 className="font-serif text-[13px] tracking-[0.2em] text-[#C5A850] font-bold uppercase">
            {isEditing ? 'Modifier l’article' : 'Ajouter un article'}
          </h3>
          <p className="text-[9px] font-mono tracking-[0.15em] text-zinc-400 uppercase mt-0.5">
            4 ÉTAPES • UNE SEULE PAGE
          </p>
        </div>
      </header>

      {/* 2. Stationary Progress Bar */}
      <div className="w-full bg-[#E3DDD0] h-[3px] shrink-0 z-40">
        <div 
          className="bg-[#C5A850] h-[3px] transition-all duration-500 ease-out" 
          style={{ width: '100%' }}
        />
      </div>

      {/* 3. Smooth Scrollable Center Content Wrapper */}
      <div className="px-6 py-8 flex flex-col items-center">
        <div className="w-full max-w-md mx-auto flex-grow flex flex-col justify-start">
          
          <div className="space-y-8 flex-grow">
            
            {/* ------------------- STEP 1: INFORMATIONS GENERALES ------------------- */}
            <section className="space-y-6 animate-fadeIn">
                {/* Title Block */}
                <div className="space-y-1 select-none">
                  <h2 className="font-serif text-3xl font-light text-[#111111] tracking-wide leading-tight text-center sm:text-left">
                    Informations générales
                  </h2>
                  <p className="text-zinc-500 text-xs font-light leading-relaxed text-center sm:text-left">
                    Commencez par les détails de base de votre création.
                  </p>
                </div>

                {/* Nom de l'article */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-semibold">
                    NOM DE L'ARTICLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Veste en Cuir Noir"
                    className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-4 py-3.5 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-sans shadow-sm"
                  />
                </div>

                {/* Description détaillée */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-semibold">
                    DESCRIPTION DÉTAILLÉE *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Matière, coupe, conseils d'entretien..."
                    className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-4 py-3.5 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all leading-relaxed font-sans shadow-sm"
                  />
                </div>

                {/* Catégorie Grid (Perfectly Symmetric & Centered) */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-semibold">
                    CATÉGORIE *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryOptions.map(cat => {
                      const isSelected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`py-3.5 px-4 text-xs font-semibold rounded-xl border transition-all text-center select-none cursor-pointer duration-300 ${
                            isSelected 
                              ? 'bg-[#C5A850] text-white border-[#C5A850] shadow-md shadow-[#C5A850]/20 transform -translate-y-0.5' 
                              : 'bg-[#FCFBF9] text-[#111111] border-[#E3DDD0] hover:border-[#C5A850] hover:bg-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Marque & Genre (Perfectly Balanced Horizontal Row) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Marque */}
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-semibold">
                      MARQUE
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      placeholder="Optionnel"
                      className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-4 py-3.5 text-sm text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-sans shadow-sm"
                    />
                  </div>

                  {/* Genre */}
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-semibold">
                      GENRE
                    </label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-4 py-3.5 text-sm text-[#111111] outline-none focus:border-[#C5A850] focus:ring-1 focus:ring-[#C5A850] transition-all font-sans shadow-sm cursor-pointer"
                    >
                      <option value="" disabled>Sélectionner</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                    </select>
                  </div>
                </div>
            </section>

            {/* ------------------- STEP 2: MEDIAS DU PRODUIT (HIGH ART DESIGN) ------------------- */}
            <section className="space-y-6 animate-fadeIn pt-10 border-t border-[#D8CFBF]">
                {/* Title Block */}
                <div className="space-y-1 select-none">
                  <h2 className="font-serif text-3xl font-light text-[#111111] tracking-wide leading-tight text-center">
                    Médias du produit
                  </h2>
                  <p className="text-zinc-500 text-xs font-light leading-relaxed text-center">
                    La qualité visuelle est essentielle pour le e-commerce premium.
                  </p>
                </div>

                {/* Interactive Premium Upload Area */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[220px] cursor-pointer group shadow-sm ${
                    isDragOver 
                      ? 'border-[#C5A850] bg-[#C5A850]/10 scale-[1.01]' 
                      : 'border-[#E3DDD0] bg-[#FCFBF9] hover:border-[#C5A850] hover:bg-white'
                  }`}
                >
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    id="media-file-input" 
                    className="hidden" 
                  />
                  <label htmlFor="media-file-input" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    <div className="w-14 h-14 bg-[#C5A850]/10 rounded-full flex items-center justify-center mb-4 text-[#C5A850] group-hover:scale-110 group-hover:bg-[#C5A850]/20 transition-all duration-300">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm text-[#111111] block mb-1">
                      Ajouter des photos
                    </span>
                    <span className="text-zinc-400 text-xs font-light max-w-[260px] leading-relaxed block">
                      JPG, PNG ou WebP · conversion WebP automatique · maximum 1 Mo.
                    </span>
                  </label>
                </div>

                {mediaError && (
                  <p className="text-xs text-[#b43a2b]" role="alert">{mediaError}</p>
                )}

                {/* Uploaded Files Preview & Grid (No Layout Shifting) */}
                {uploadedMedia.length > 0 ? (
                  <div className="space-y-3">
                    <span className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-500 font-semibold">
                      FICHIERS SÉLECTIONNÉS ({uploadedMedia.length})
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedMedia.map((media, index) => (
                        <div 
                          key={index} 
                          className="relative aspect-square rounded-xl overflow-hidden border border-[#E3DDD0] bg-zinc-100 group animate-fadeIn"
                        >
                          <img src={media.url} alt={`Upload preview ${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 backdrop-blur-sm transition-all duration-200"
                            title="Supprimer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : initialProduct?.images.length ? (
                  <div className="space-y-3">
                    <span className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-500 font-semibold">
                      MÉDIAS ACTUELS ({initialProduct.images.length})
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {initialProduct.images.map((image, index) => (
                        <div key={`${image.url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[#E3DDD0] bg-zinc-100">
                          <img src={image.url} alt={`${initialProduct.name}, média ${index + 1}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500">Ajoutez de nouveaux médias uniquement si vous souhaitez remplacer ceux-ci.</p>
                  </div>
                ) : (
                  <div className="p-4 bg-[#C5A850]/5 rounded-xl border border-[#C5A850]/20 flex gap-4 items-center select-none animate-fadeIn">
                    <img 
                      src="/images/default-fashion-cover-v2.png" 
                      alt="Aperçu éditorial mode par défaut" 
                      className="w-10 h-14 rounded-lg object-cover shadow-sm border border-[#E3DDD0]/50" 
                    />
                    <div className="space-y-0.5">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#C5A850] block font-bold">
                        Image de démonstration par défaut
                      </span>
                      <span className="text-zinc-500 text-xs font-light block leading-tight">
                        Aucun fichier sélectionné. Le vestiaire utilisera une image de couverture de luxe par défaut.
                      </span>
                    </div>
                  </div>
                )}
            </section>

            {/* ------------------- STEP 3: VARIANTES & STOCK (MASTERPIECE DESIGN) ------------------- */}
            <section className="space-y-6 animate-fadeIn pt-10 border-t border-[#D8CFBF]">
                {/* Title Block */}
                <div className="space-y-1 select-none text-center sm:text-left">
                  <h2 className="font-serif text-3xl font-light text-[#111111] tracking-wide leading-tight">
                    Variantes & Stock
                  </h2>
                  <p className="text-zinc-500 text-xs font-light leading-relaxed">
                    Définissez vos tailles, prix et gérez vos stocks.
                  </p>
                </div>

                {/* Tailles disponibles */}
                <div className="space-y-2.5">
                  {isShoeProduct ? (
                    <div className="rounded-2xl border border-[#E3DDD0] bg-[#FCFBF9] p-4 shadow-sm">
                      <div className="mb-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-bold">
                          PLAGE DE POINTURES
                        </label>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                          La liste client sera générée automatiquement entre ces deux valeurs.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600">
                          Pointure minimale
                          <input
                            type="number"
                            inputMode="numeric"
                            min={SHOE_SIZE_MIN}
                            max={SHOE_SIZE_MAX - 1}
                            step="1"
                            value={shoeSizeMin}
                            onChange={(event) => setShoeSizeMin(event.target.value)}
                            className="min-h-12 w-full rounded-xl border border-[#E3DDD0] bg-white px-3 text-center text-base font-bold text-[#111111] outline-none transition-colors focus:border-[#C5A850]"
                          />
                        </label>
                        <label className="space-y-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600">
                          Pointure maximale
                          <input
                            type="number"
                            inputMode="numeric"
                            min={SHOE_SIZE_MIN + 1}
                            max={SHOE_SIZE_MAX}
                            step="1"
                            value={shoeSizeMax}
                            onChange={(event) => setShoeSizeMax(event.target.value)}
                            className="min-h-12 w-full rounded-xl border border-[#E3DDD0] bg-white px-3 text-center text-base font-bold text-[#111111] outline-none transition-colors focus:border-[#C5A850]"
                          />
                        </label>
                      </div>

                      {shoeSizeError ? (
                        <p role="alert" className="mt-3 flex items-start gap-2 text-[11px] font-semibold text-red-700">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {shoeSizeError}
                        </p>
                      ) : (
                        <div className="mt-4">
                          <p className="mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#C5A850]">
                            {generatedShoeSizes.length} pointures générées
                          </p>
                          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto" aria-label="Pointures générées">
                            {generatedShoeSizes.map((shoeSize) => (
                              <span key={shoeSize} className="min-w-9 rounded-lg border border-[#E3DDD0] bg-white px-2 py-1.5 text-center text-xs font-bold text-zinc-700">
                                {shoeSize}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-bold">
                            TAILLES DISPONIBLES
                          </label>
                          <p className="mt-1 text-[10px] text-zinc-500">XL et XXL sont toujours incluses.</p>
                        </div>
                        {isAddingSize ? (
                          <div className="flex items-center gap-1.5 animate-fadeIn">
                            <input
                              type="text"
                              autoFocus
                              value={newSize}
                              onChange={e => setNewSize(e.target.value)}
                              placeholder="EX: 3XL"
                              className="w-16 bg-[#FCFBF9] border border-[#C5A850] text-center rounded-lg px-2 py-1 text-xs uppercase font-mono font-bold outline-none"
                              onKeyDown={e => { if (e.key === 'Enter') handleAddSize(); }}
                            />
                            <button type="button" onClick={handleAddSize} className="bg-[#C5A850] text-white p-1 rounded-lg text-xs">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setIsAddingSize(false); setNewSize(''); }}
                              className="bg-zinc-200 text-zinc-500 p-1 rounded-lg text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingSize(true)}
                            className="text-[10px] font-mono tracking-widest uppercase text-[#C5A850] hover:text-[#111111] transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Custom
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 select-none">
                        {sizeOptions.map(sz => {
                          const isRequiredSize = sz === 'XL' || sz === 'XXL';
                          const isSelected = isRequiredSize || sizes.includes(sz);
                          return (
                            <button
                              type="button"
                              key={sz}
                              disabled={isRequiredSize}
                              onClick={() => handleSizeToggle(sz)}
                              title={isRequiredSize ? 'Taille obligatoire' : undefined}
                              className={`h-10 min-w-[50px] px-3.5 text-xs flex items-center justify-center rounded-xl border transition-all select-none font-bold duration-200 ${
                                isSelected
                                  ? 'bg-[#C5A850] text-white border-[#C5A850] shadow-md shadow-[#C5A850]/20'
                                  : 'bg-[#FCFBF9] border-[#E3DDD0] text-zinc-600 hover:border-[#C5A850] hover:bg-white cursor-pointer'
                              } ${isRequiredSize ? 'cursor-not-allowed ring-1 ring-[#C5A850]/30' : ''}`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Nuances (Couleurs) */}
                <div className="space-y-4 pt-4 border-t border-[#E3DDD0]/60">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-bold">
                      COULEURS DU PRODUIT
                    </label>
                  </div>

                  <p className="text-zinc-500 text-[11px] font-light leading-relaxed">
                    Utilisez le sélecteur de couleurs ou tapez un code hexadécimal pour créer des nuances sur mesure.
                  </p>

                  {/* Premium Interactive Color Picker Card */}
                  <div className="bg-[#FCFBF9] border border-[#E3DDD0] rounded-2xl p-3.5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD0]/40 select-none">
                      <span className="text-[8.5px] font-mono text-zinc-400 tracking-wider uppercase font-bold">
                        AJUSTEMENT DE LA NUANCE
                      </span>
                      <span className="text-[7.5px] font-mono text-[#C5A850] bg-[#C5A850]/10 px-2 py-0.5 rounded-full font-semibold">
                        Trois Barrettes
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                      {/* Left Block: The 3 Sleek Color Sliders and Live Preview */}
                      <div className="flex-1 flex flex-col justify-between p-3 bg-white border border-[#E3DDD0]/70 rounded-xl space-y-3 shadow-sm select-none">
                        
                        {/* Slider 1: Teinte (Hue) */}
                        <ColorSlider
                          label="Teinte (Angle)"
                          value={hsv.h}
                          max={360}
                          gradient="linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
                          onChange={handleHueChange}
                        />

                        {/* Slider 2: Saturation */}
                        <ColorSlider
                          label="Saturation"
                          value={hsv.s}
                          max={100}
                          gradient={`linear-gradient(to right, #ffffff, ${hsvToHex(hsv.h, 100, 100)})`}
                          onChange={handleSaturationChange}
                        />

                        {/* Slider 3: Luminosité */}
                        <ColorSlider
                          label="Luminosité"
                          value={hsv.v}
                          max={100}
                          gradient={`linear-gradient(to right, #000000, ${hsvToHex(hsv.h, hsv.s, 100)})`}
                          onChange={handleValueChange}
                        />

                        {/* Live Color Pill & Hex Input */}
                        <div className="w-full pt-2 border-t border-zinc-100 flex items-center bg-[#FCFBF9] px-2.5 py-1.5 rounded-lg border border-[#E3DDD0]/40">
                          {/* Round square Color preview */}
                          <div 
                            className="w-7 h-7 rounded-lg border border-zinc-200/50 shadow-inner flex-shrink-0 transition-colors duration-150"
                            style={{ backgroundColor: customColorHex }}
                          />
                          
                          {/* Live Hex Value */}
                          <div className="ml-2.5 flex-grow text-left">
                            <span className="block text-[6.5px] font-mono text-zinc-400 uppercase tracking-widest leading-none">
                              NUANCE ACTIVE
                            </span>
                            <div className="flex items-center">
                              <span className="text-xs font-mono font-bold text-zinc-400 mr-0.5">#</span>
                              <input
                                type="text"
                                value={customColorHex.startsWith('#') ? customColorHex.slice(1) : customColorHex}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val.length <= 7) {
                                    handleHexInputChange(val);
                                  }
                                }}
                                className="text-xs font-mono font-bold text-zinc-800 uppercase tracking-wider outline-none bg-transparent w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Name, Customization & Add Controls */}
                      <div className="flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-3">
                          {/* Color Name Field */}
                          <div className="space-y-1">
                            <label className="block text-[8px] uppercase tracking-wider font-mono text-zinc-500 font-bold">
                              NOM DE LA COULEUR PERSONNALISÉE
                            </label>
                            <input
                              type="text"
                              value={newColor}
                              onChange={e => setNewColor(e.target.value)}
                              placeholder="ex: Vert Olive, Blanc Satin..."
                              className="w-full bg-white border border-[#E3DDD0] rounded-lg px-2.5 py-1.5 text-xs text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] font-sans transition-colors shadow-inner"
                              onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newColor.trim()) {
                                      const trimmed = newColor.trim();
                                      if (!colors.includes(trimmed)) {
                                        setColors(prev => [...prev, trimmed]);
                                        setCustomColors(prev => ({ ...prev, [trimmed]: customColorHex }));
                                      }
                                      setNewColor('');
                                    }
                                  }
                                }}
                            />
                          </div>

                          {/* Quick Palette Bases to start with */}
                          <div className="space-y-1">
                            <label className="block text-[8px] font-mono text-zinc-400 tracking-wider uppercase font-bold">
                              RÉGENTS RAPIDES
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { name: 'Noir Ébène', hex: '#1C1C1C' },
                                { name: 'Blanc Pur', hex: '#FAFAFA' },
                                { name: 'Beige Sable', hex: '#D2B48C' },
                                { name: 'Rouge Bordeaux', hex: '#6B1124' },
                                { name: 'Vert Sauge', hex: '#9FAF90' },
                                { name: 'Bleu Marine', hex: '#0D1B2A' },
                                { name: 'Rose Poudré', hex: '#F7C6C7' },
                                { name: 'Jaune Or', hex: '#D4AF37' }
                              ].map(base => (
                                <button
                                  type="button"
                                  key={base.name}
                                  onClick={() => {
                                    setCustomColorHex(base.hex);
                                    setHsv(hexToHsv(base.hex));
                                    setNewColor(base.name);
                                  }}
                                  className="flex items-center gap-1.5 bg-white hover:bg-zinc-50 border border-[#E3DDD0] px-2 py-1 rounded-lg text-[#111111] transition-all cursor-pointer hover:border-[#C5A850]/50 hover:shadow-sm"
                                >
                                  <span className="w-2 h-2 rounded-full border border-zinc-200 shrink-0" style={{ backgroundColor: base.hex }} />
                                  <span className="font-medium text-[8.5px] truncate">{base.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Add Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newColor.trim();
                            const nameToAdd = trimmed || `Nuance ${customColorHex.toUpperCase()}`;
                            if (!colors.includes(nameToAdd)) {
                              setColors(prev => [...prev, nameToAdd]);
                              setCustomColors(prev => ({ ...prev, [nameToAdd]: customColorHex }));
                            }
                            setNewColor('');
                          }}
                          className="w-full bg-[#111111] hover:bg-[#C5A850] text-white py-2 rounded-xl text-[9px] font-mono tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer font-bold shadow-sm"
                        >
                          <Plus className="w-3 h-3" /> Ajouter cette nuance
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selected Colors Section */}
                  <div className="space-y-2">
                    <span className="block text-[9px] font-mono text-zinc-400 tracking-wider uppercase">
                      NUANCES SÉLECTIONNÉES ({colors.length})
                    </span>

                    {colors.length === 0 ? (
                      <div className="border border-dashed border-[#E3DDD0] bg-[#FCFBF9]/60 rounded-xl p-5 text-center text-zinc-500 text-xs font-light select-none">
                        Aucune nuance ajoutée pour le moment.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-5 mt-3 animate-fadeIn">
                        {colors.map(col => {
                          // Find hex code: check preset swatches/COLOR_MAP first, then customColors, default to placeholder beige
                          const colorDetails: { hex: string; border?: boolean } = COLOR_MAP[col] || { hex: customColors[col] || '#D2B48C' };
                          return (
                            <div key={col} className="relative flex flex-col items-center group select-none animate-fadeIn">
                              {/* Color Circle */}
                              <div 
                                className="w-14 h-14 rounded-full shadow-md relative transition-transform duration-200 group-hover:scale-105"
                                style={{ 
                                  backgroundColor: colorDetails.hex,
                                  border: colorDetails.border ? '1px solid #E3DDD0' : 'none'
                                }}
                              >
                                {/* Minus Button on Top-Right */}
                                <button
                                  type="button"
                                  onClick={() => setColors(prev => prev.filter(c => c !== col))}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white hover:scale-110 transition-all cursor-pointer"
                                  title={`Supprimer ${col}`}
                                >
                                  <span className="text-sm font-bold leading-none select-none" style={{ marginTop: '-2px' }}>-</span>
                                </button>
                              </div>
                              {/* Color Label */}
                              <span className="text-[10px] font-semibold text-zinc-700 mt-1.5 text-center max-w-[64px] truncate leading-tight">
                                {col}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Prix & Quantité Card (Perfect Polish & Symmetry) */}
                <div className="pt-3 border-t border-[#E3DDD0]/60 space-y-3">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-bold">
                    PRIX & QUANTITÉ
                  </label>

                  <div className="bg-[#FCFBF9] border border-[#E3DDD0] rounded-2xl p-5 space-y-4 shadow-sm">
                    {/* Row 1: Prix de Vente & Prix Promo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                          PRIX DE VENTE *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl pl-3 pr-10 py-2.5 text-sm text-[#111111] outline-none focus:border-[#C5A850] font-sans"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-zinc-400 font-bold">
                            DA
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                          PRIX PROMO (OPT)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={promoPrice}
                            onChange={e => setPromoPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl pl-3 pr-10 py-2.5 text-sm text-[#111111] outline-none focus:border-[#C5A850] font-sans"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-zinc-400 font-bold">
                            DA
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Quantité & SKU */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                          QUANTITÉ EN STOCK
                        </label>
                        <input
                          type="number"
                          value={stock}
                          onChange={e => setStock(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#C5A850] font-sans"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                          SKU (RÉF. INTERNE)
                        </label>
                        <input
                          type="text"
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          placeholder="ABC-123"
                          className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-3 py-2.5 text-sm text-[#111111] uppercase placeholder-zinc-400 outline-none focus:border-[#C5A850] font-sans font-mono"
                        />
                      </div>
                    </div>

                    {/* Row 3: Alert low stock checkbox */}
                    <div className="pt-2 border-t border-[#E3DDD0]/50 flex items-center justify-between select-none">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 font-light">
                        <input
                          type="checkbox"
                          checked={alertLowStock}
                          onChange={e => setAlertLowStock(e.target.checked)}
                          className="w-4 h-4 rounded text-[#C5A850] focus:ring-[#C5A850] border-[#E3DDD0] bg-[#FCFBF9] cursor-pointer"
                        />
                        <span>M'alerter quand le stock est bas</span>
                      </label>

                      {alertLowStock && (
                        <div className="flex items-center gap-1.5 animate-fadeIn">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase">Seuil :</span>
                          <input
                            type="number"
                            value={lowStockThreshold}
                            onChange={e => setLowStockThreshold(e.target.value)}
                            className="w-12 bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-1.5 py-1 text-xs text-center font-mono text-[#111111] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Composition/Matières Section */}
                <div className="space-y-2.5 pt-3 border-t border-[#E3DDD0]/60">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-700 font-bold">
                      MATIÈRES DE COMPOSITION
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingMaterial(prev => !prev)}
                      className="text-[10px] font-mono tracking-widest uppercase text-[#C5A850] hover:text-[#111111] transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Ajouter
                    </button>
                  </div>

                  {isAddingMaterial && (
                    <div className="flex gap-2 p-3 bg-white border border-[#C5A850]/30 rounded-xl animate-fadeIn shadow-sm">
                      <input
                        type="text"
                        autoFocus
                        value={newMaterial}
                        onChange={e => setNewMaterial(e.target.value)}
                        placeholder="ex: Soie Mulberry, Coton Égyptien..."
                        className="flex-grow bg-[#FCFBF9] border border-[#E3DDD0] rounded-lg px-3 py-2 text-xs text-[#111111] placeholder-zinc-400 outline-none focus:border-[#C5A850] font-sans"
                        onKeyDown={e => { if (e.key === 'Enter') handleAddMaterial(); }}
                      />
                      <button
                        type="button"
                        onClick={handleAddMaterial}
                        className="px-3 py-2 bg-[#C5A850] text-white rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingMaterial(false); setNewMaterial(''); }}
                        className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {materials.length === 0 ? (
                    <div className="border border-dashed border-[#E3DDD0] bg-[#FCFBF9]/60 rounded-xl p-4 text-center text-zinc-500 text-xs font-light select-none">
                      Aucune matière de composition ajoutée.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {materials.map(mat => (
                        <span key={mat} className="bg-[#FCFBF9] border border-[#E3DDD0] text-[#111111] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm">
                          <Layers className="w-3 h-3 text-zinc-400" />
                          <span>{mat}</span>
                          <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors" onClick={() => setMaterials(prev => prev.filter(m => m !== mat))} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
            </section>

            {/* ------------------- STEP 4: LIVRAISON & VISIBILITÉ (HIGH END DESIGN) ------------------- */}
            <section className="space-y-6 animate-fadeIn pt-10 border-t border-[#D8CFBF]">
                {/* Title Block */}
                <div className="space-y-1 select-none text-center sm:text-left">
                  <h2 className="font-serif text-3xl font-light text-[#111111] tracking-wide leading-tight">
                    Livraison & Visibilité
                  </h2>
                  <p className="text-zinc-500 text-xs font-light leading-relaxed">
                    Derniers réglages avant de mettre en ligne.
                  </p>
                </div>

                {/* EXPÉDITION Card */}
                <div className="bg-white border border-[#E3DDD0] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-[#E3DDD0]/40 pb-3">
                    <Package className="w-5 h-5 text-[#C5A850]" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-800 font-bold">
                      EXPÉDITION
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                        POIDS (KG)
                      </label>
                      <input
                        type="text"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="0.5"
                        className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#C5A850] font-sans"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 font-semibold">
                        FRAIS DE LIVRAISON
                      </label>
                      <input
                        type="text"
                        value={shippingFee}
                        onChange={e => setShippingFee(e.target.value)}
                        placeholder="Standard"
                        className="w-full bg-[#FCFBF9] border border-[#E3DDD0] rounded-xl px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#C5A850] font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* VISIBILITÉ DE L'ARTICLE Card */}
                <div className="bg-white border border-[#E3DDD0] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-[#E3DDD0]/40 pb-3">
                    <Globe className="w-5 h-5 text-[#C5A850]" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-800 font-bold">
                      VISIBILITÉ DE L'ARTICLE
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Publier immédiatement */}
                    <button
                      type="button"
                      onClick={() => setPublishStatus('immediate')}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between cursor-pointer select-none ${
                        publishStatus === 'immediate'
                          ? 'border-[#C5A850] bg-[#C5A850]/5 shadow-sm'
                          : 'border-[#E3DDD0] bg-[#FCFBF9] hover:bg-white hover:border-[#C5A850]/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="block text-sm font-semibold text-[#111111]">
                          Publier immédiatement
                        </span>
                        <span className="block text-xs text-zinc-500 font-light">
                          Visible sur la boutique dès maintenant
                        </span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                        publishStatus === 'immediate'
                          ? 'bg-[#C5A850] border-[#C5A850] text-white'
                          : 'border-zinc-300 bg-white'
                      }`}>
                        {publishStatus === 'immediate' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Option 2: Sauvegarder comme brouillon */}
                    <button
                      type="button"
                      onClick={() => setPublishStatus('draft')}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between cursor-pointer select-none ${
                        publishStatus === 'draft'
                          ? 'border-[#C5A850] bg-[#C5A850]/5 shadow-sm'
                          : 'border-[#E3DDD0] bg-[#FCFBF9] hover:bg-white hover:border-[#C5A850]/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="block text-sm font-semibold text-[#111111]">
                          Sauvegarder comme brouillon
                        </span>
                        <span className="block text-xs text-zinc-500 font-light">
                          Vous pourrez le publier plus tard
                        </span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                        publishStatus === 'draft'
                          ? 'bg-[#C5A850] border-[#C5A850] text-white'
                          : 'border-zinc-300 bg-white'
                      }`}>
                        {publishStatus === 'draft' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>
            </section>

          </div>

          {/* Spacer */}
          <div className="pt-8 flex-shrink-0" />

        </div>
      </div>

      {/* Final action stays in the document flow so it is reached by scrolling. */}
      <footer className="w-full min-h-24 border-t border-[#E3DDD0] bg-[#F4EFE6] px-6 py-6 flex items-center justify-end select-none">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C29D38] via-[#E5C158] to-[#C29D38] rounded-xl blur-lg opacity-30 group-hover:opacity-75 transition-all duration-500" />
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="relative cursor-pointer bg-gradient-to-r from-[#DAB24B] via-[#FBE395] to-[#C09A34] text-[#111111] font-bold text-[10px] tracking-widest uppercase py-3.5 px-8 rounded-xl shadow-[0_8px_20px_rgba(197,168,80,0.3)] border-t border-[#FFF6D1]/40 border-r border-b border-[#8C6B1C]/30 flex items-center justify-center transition-all duration-300 min-w-[130px]"
          >
            <span>{isEditing ? 'Enregistrer les modifications' : 'Publier'}</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
