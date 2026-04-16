'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../src/contexts/AuthContext';
import { useProducts } from '../src/contexts/ProductContext';
import { useCart } from '../src/contexts/CartContext';
import CartIcon from '../src/components/CartIcon';
import CartModal from '../src/components/CartModal';
import WhatsAppButton from '../src/components/WhatsAppButton';
import FloatingCartButton from '../src/components/FloatingCartButton';
import BarcodeScanner from '../src/components/BarcodeScannerClient';
import TextScannerModal from '../src/components/TextScannerModal';
import BackupManager from '../src/components/BackupManager';
import ExcelExporter from '../src/components/ExcelExporter';
import dynamic from 'next/dynamic';
import { useVercelAnalytics } from '../src/hooks/useVercelAnalytics';

const FeaturedProductsCarousel = dynamic(
  () => import('@/components/FeaturedProductsCarousel'),
  { ssr: false }
);

const createEmptyFeedingGuideTable = () => ({
  columns: ['Peso', 'Ración'],
  rows: [
    {
      label: '',
      values: ['', '']
    },
    {
      label: '',
      values: ['', '']
    }
  ]
});

const MIN_FEEDING_GUIDE_COLUMNS = 2;
const MIN_FEEDING_GUIDE_ROWS = 1;

const createEmptyAccessorySpecs = () => ({
  type: '',
  dimensions: '',
  color: '',
  material: '',
  recommendedPet: '',
  highlights: ''
});

const createEmptyPharmacyInfo = () => ({
  veterinaryUse: false,
  prescriptionRequired: false,
  warnings: [],
  contraindications: [],
  sideEffects: [],
  storageConditions: '',
  activeIngredients: []
});

const createEmptyDetails = () => ({
  composition: '',
  analysis: [],
  feedingGuideTable: createEmptyFeedingGuideTable(),
  accessorySpecs: createEmptyAccessorySpecs(),
  pharmacyInfo: createEmptyPharmacyInfo()
});

const PRODUCT_FORM_CATEGORIES = ['perros', 'gatos', 'mascotasPequeñas', 'accesorios', 'farmacia'];
const PHARMACY_PRODUCT_TYPES = ['Pipeta', 'Comprimido', 'Jarabe', 'Collar', 'Spray', 'Gotas', 'Suplemento', 'Otro'];

const createEmptyFormData = (category = 'perros') => ({
  name: '',
  price: '',
  category,
  image: '',
  stock: '',
  barcode: '',
  details: createEmptyDetails()
});

// Función para generar slugs amigables para URLs (debe coincidir con la lógica de ProductContext)
const generateSlug = (text) => {
  if (!text) return '';
  
  // Usar exactamente la misma lógica que getProductBySlug en ProductContext
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const normalizeFeedingGuideTable = (table) => {
  if (
    !table ||
    !Array.isArray(table.columns) ||
    table.columns.length === 0 ||
    !Array.isArray(table.rows) ||
    table.rows.length === 0
  ) {
    return null;
  }

  const normalizedColumns = table.columns.map((col) => (typeof col === 'string' ? col : ''));

  const normalizedRows = table.rows.map((row) => {
    const rowValues = Array.isArray(row?.values) ? row.values : [];
    return {
      label: typeof row?.label === 'string' ? row.label : '',
      values: normalizedColumns.map((_, idx) => (typeof rowValues[idx] === 'string' ? rowValues[idx] : ''))
    };
  });

  return {
    columns: normalizedColumns,
    rows: normalizedRows
  };
};

const hasFeedingGuideTableData = (table) => {
  if (!table) return false;
  const hasHeader = Array.isArray(table.columns) && table.columns.some((col) => col?.trim());
  const hasCells =
    Array.isArray(table.rows) &&
    table.rows.some(
      (row) => row?.label?.trim() || (Array.isArray(row?.values) && row.values.some((value) => value?.trim()))
    );
  return Boolean(hasHeader || hasCells);
};

const hasAccessorySpecsData = (specs) => {
  if (!specs || typeof specs !== 'object') return false;
  return Object.values(specs).some((value) => typeof value === 'string' && value.trim());
};

const hasPharmacyInfoData = (info) => {
  if (!info || typeof info !== 'object') return false;
  return Object.values(info).some((value) => typeof value === 'string' && value.trim());
};

const cloneFeedingGuideTable = (table) => {
  const columns = Array.isArray(table?.columns) ? [...table.columns] : [];
  const rows = Array.isArray(table?.rows)
    ? table.rows.map((row) => ({
        label: row?.label ?? '',
        values: columns.map((_, idx) => row?.values?.[idx] ?? '')
      }))
    : [];

  return {
    columns,
    rows
  };
};

const normalizeAccessorySpecs = (specs) => {
  const base = createEmptyAccessorySpecs();
  if (!specs || typeof specs !== 'object') return base;
  return {
    ...base,
    type: specs.type || '',
    dimensions: specs.dimensions || '',
    color: specs.color || '',
    material: specs.material || '',
    recommendedPet: specs.recommendedPet || '',
    highlights: specs.highlights || ''
  };
};

const normalizePharmacyInfo = (info) => {
  const base = createEmptyPharmacyInfo();
  if (!info || typeof info !== 'object') return base;
  return {
    ...base,
    productType: info.productType || '',
    indications: info.indications || '',
    usage: info.usage || '',
    contraindications: info.contraindications || ''
  };
};

const getProductCardKey = (product) => product?.id ?? product?.barcode ?? product?.name;

const getProductAnchorId = (product) => {
  const rawKey =
    getProductCardKey(product) ??
    product?.name ??
    product?.barcode ??
    '';
  return rawKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const getProductSlug = (product) => {
  return product.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const navigateToProduct = (product) => {
  const slug = getProductSlug(product);
  window.location.href = `/producto/${slug}`;
};

const SOCIAL_SHARE_OPTIONS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    accentClass: 'text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-500/10',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2A10 10 0 002.05 14.32 1 1 0 003 15h1v4a1 1 0 001.6.8l2.77-2.08A9.94 9.94 0 0012 22a10 10 0 000-20zm5.53 14.47l-.22.62a.8.8 0 01-.76.54 7 7 0 01-6.31-3.87 6.6 6.6 0 01-.71-2.84.8.8 0 01.55-.77l.62-.21a.81.81 0 01.9.33l1 1.53a.8.8 0 01.08.73 1.39 1.39 0 00.09 1s.49.86 1.12 1.37c.61.48 1.31.71 1.31.71a.8.8 0 01.55.53l.47 1.48a.79.79 0 01-.02.64z" />
      </svg>
    ),
    buildUrl: (shareData) => {
      const message = shareData?.message || [shareData?.text, shareData?.url].filter(Boolean).join('\n');
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
  },
];

const CATALOG_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ranchomascotas.cl/';
const CATALOG_SHARE_MESSAGE = 'Descubre el catálogo de Rancho Mascotas';

const CATALOG_SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    accent: 'text-green-600',
    buildUrl: (message, url) => `https://api.whatsapp.com/send?text=${encodeURIComponent(`${message}\n${url}`)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M12 2A10 10 0 002.05 14.32 1 1 0 003 15h1v4a1 1 0 001.6.8l2.77-2.08A9.94 9.94 0 0012 22a10 10 0 000-20zm5.53 14.47l-.22.62a.8.8 0 01-.76.54 7 7 0 01-6.31-3.87 6.6 6.6 0 01-.71-2.84.8.8 0 01.55-.77l.62-.21a.81.81 0 01.9.33l1 1.53a.8.8 0 01.08.73 1.39 1.39 0 00.09 1s.49.86 1.12 1.37c.61.48 1.31.71 1.31.71a.8.8 0 01.55.53l.47 1.48a.79.79 0 01-.02.64z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Facebook',
    accent: 'text-blue-600',
    buildUrl: (_message, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M13 22v-7h3l.5-3H13V9.5A1.5 1.5 0 0114.5 8H17V5h-2.5A4.5 4.5 0 0010 9.5V12H7v3h3v7z" />
      </svg>
    )
  },
  {
    id: 'x',
    label: 'X',
    accent: 'text-gray-900',
    buildUrl: (message, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${message} ${url}`)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M18.244 3H21l-6.557 7.49L22 21h-4.845l-4.06-5.253L8.329 21H3.244l6.978-7.972L3 3h4.95l3.693 4.837zM17.4 19h1.34L7.05 5H5.59z" />
      </svg>
    )
  },
  {
    id: 'telegram',
    label: 'Telegram',
    accent: 'text-sky-500',
    buildUrl: (message, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M9.04 15.803l-.376 5.297c.54 0 .773-.232 1.052-.51l2.526-2.415 5.232 3.83c.96.53 1.64.252 1.89-.89l3.422-16.052h.001c.304-1.413-.51-1.965-1.45-1.62L1.504 10.447C.124 10.982.133 11.76 1.257 12.098l5.232 1.63 12.163-7.66c.572-.378 1.095-.169.665.209z" />
      </svg>
    )
  }
];

export default function Home() {
  const { user, login, logout } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProducts();
  const { realTimeData, trackPageView } = useVercelAnalytics();
  const isAdmin = user?.role === 'admin';
  const [activeCategory, setActiveCategory] = useState('todos'); // Valor por defecto 'todos'
  const [showLogin, setShowLogin] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [headerLogoFailed, setHeaderLogoFailed] = useState(false);
  const [formData, setFormData] = useState(() => createEmptyFormData('perros'));
  const [priceDisplayValue, setPriceDisplayValue] = useState('');
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart, addToCart } = useCart();
  const [alert, setAlert] = useState(null);
  const [clickedButtons, setClickedButtons] = useState({});
  
  // Función para manejar el clic en el logo
  const handleLogoClick = (e) => {
    e.preventDefault();
    setSearchTerm('');
    setPriceFilter(100000);
    setLifeStage('all');
    setSortBy('name');
    setLetterFilter('all');
    window.location.href = '/';
  };
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState(100000);
  const [lifeStage, setLifeStage] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [letterFilter, setLetterFilter] = useState('all');
  const [isListening, setIsListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [showTextScanner, setShowTextScanner] = useState(false);
  const [textScannerTarget, setTextScannerTarget] = useState(null);
  // Visitor counter removed
  const [expandedCompositions, setExpandedCompositions] = useState({});
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [featuredProcessingId, setFeaturedProcessingId] = useState(null);
  const searchInputRef = useRef(null);
  const voiceInputTargetRef = useRef('search');
  const hasAppliedSharedFiltersRef = useRef(false);
  const sharedLinkParamsRef = useRef(null);
  const [shareMenuContext, setShareMenuContext] = useState(null);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(true);
  const [stockFilter, setStockFilter] = useState('all'); // Nuevo filtro por cantidad de stock

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setSupportsNativeShare(true);
    }
  }, []);

  useEffect(() => {
    if (!shareMenuContext || typeof document === 'undefined') return;

    const handleClickOutside = (event) => {
      if (typeof Element !== 'undefined' && event.target instanceof Element) {
        if (
          event.target.closest('[data-share-menu]') ||
          event.target.closest('[data-share-trigger]')
        ) {
          return;
        }
      }
      setShareMenuContext(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShareMenuContext(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shareMenuContext]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasAppliedSharedFiltersRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sharedCategory = params.get('categoria');
    const sharedSearch =
      params.get('buscar') ?? params.get('productoNombre') ?? params.get('producto');
    const sharedProductId = params.get('productoId');
    const sharedBarcode = params.get('barcode');

    if (!sharedCategory && !sharedSearch && !sharedProductId && !sharedBarcode) return;

    sharedLinkParamsRef.current = {
      category: sharedCategory,
      search: sharedSearch,
      productId: sharedProductId,
      barcode: sharedBarcode,
      appliedProductDetails: false
    };

    if (sharedCategory) {
      setActiveCategory(sharedCategory);
    }

    if (sharedSearch) {
      setSearchTerm(sharedSearch);
      if (searchInputRef.current) {
        searchInputRef.current.value = sharedSearch;
      }
    }

    hasAppliedSharedFiltersRef.current = true;
  }, []);

  const buildProductSharePayload = useCallback(
    (product) => {
      if (!product || typeof window === 'undefined' || typeof URL === 'undefined') {
        return null;
      }

      // Generar enlace directo a la página de detalles del producto
      const productSlug = product.slug || generateSlug(product.name);
      const shareUrl = new URL(`${window.location.origin}/producto/${productSlug}`);

      const hasPrice = typeof product.price === 'number' && !Number.isNaN(product.price);
      const priceSnippet = hasPrice ? ` por $${Number(product.price).toLocaleString('es-CL')}` : '';
      const shareTextBase = product.name
        ? `${product.name} - Rancho Mascotas${priceSnippet}`
        : `Producto - Rancho Mascotas${priceSnippet}`;
      const shareMessage = `${shareTextBase}\n${shareUrl.toString()}`;

      return {
        title: product.name || 'Producto del catálogo',
        text: shareTextBase,
        url: shareUrl.toString(),
        message: shareMessage
      };
    },
    [activeCategory]
  );

  const handleCopyShareLink = async (product, shareDataOverride) => {
    const shareData = shareDataOverride ?? buildProductSharePayload(product);

    if (!shareData?.url) {
      showAlert('No se pudo generar el enlace para compartir.', 'error');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = shareData.url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } else {
        throw new Error('Clipboard API no disponible');
      }
      showAlert('Enlace copiado para compartir', 'success');
      setShareMenuContext(null);
    } catch (error) {
      console.error('Error copiando enlace al portapapeles:', error);
      showAlert('No se pudo copiar el enlace automáticamente.', 'error');
    }
  };

  // Efecto para detectar la posición del scroll
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      
      const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 10;
      const isAtTop = window.scrollY < 10;
      
      setShowScrollUp(!isAtTop);
      setShowScrollDown(!isAtBottom);
      
      console.log('Scroll position:', { scrollY: window.scrollY, isAtTop, isAtBottom });
    };

    // Asegurarse de que el efecto se ejecute al montar
    if (typeof window !== 'undefined') {
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleScrollToFooter = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
    setShowScrollDown(false);
  };

  const handleAccessorySpecChange = (field, value) => {
    setFormData((prev) => {
      const prevDetails = prev.details || createEmptyDetails();
      const prevSpecs = normalizeAccessorySpecs(prevDetails.accessorySpecs);
      return {
        ...prev,
        details: {
          ...prevDetails,
          accessorySpecs: {
            ...prevSpecs,
            [field]: value
          }
        }
      };
    });
  };

  const handlePharmacyInfoChange = (field, value) => {
    setFormData((prev) => {
      const prevDetails = prev.details || createEmptyDetails();
      const prevPharmacyInfo = normalizePharmacyInfo(prevDetails.pharmacyInfo);
      return {
        ...prev,
        details: {
          ...prevDetails,
          pharmacyInfo: {
            ...prevPharmacyInfo,
            [field]: value
          }
        }
      };
    });
  };

  const handleScrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    setShowScrollUp(false);
  };

  const handleNativeShare = async (product, shareDataOverride) => {
    const shareData = shareDataOverride ?? buildProductSharePayload(product);

    if (!shareData?.url) {
      showAlert('No se pudo generar el enlace para compartir.', 'error');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        setShareMenuContext(null);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('Error usando la API de compartir:', error);
      }
    }

    await handleCopyShareLink(product, shareData);
  };

  const toggleShareMenuForProduct = (product) => {
    setShareMenuContext((current) => {
      const cardKey = getProductCardKey(product);
      if (current?.cardKey === cardKey) {
        return null;
      }

      const shareData = buildProductSharePayload(product);
      if (!shareData?.url) {
        showAlert('No se pudo generar el enlace para compartir.', 'error');
        return current;
      }

      return {
        cardKey,
        product,
        shareData
      };
    });
  };

  const handleShareOptionClick = (option, shareData) => {
    if (!option || typeof window === 'undefined') return;
    if (!shareData?.url) {
      showAlert('No se pudo generar el enlace para compartir.', 'error');
      return;
    }

    try {
      if (option.mode === 'copy') {
        handleCopyShareLink(null, shareData);
      } else {
        const url = option.buildUrl(shareData);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setShareMenuContext(null);
    } catch (error) {
      console.error('Error abriendo opción de compartir:', error);
      showAlert('No se pudo abrir la opción seleccionada.', 'error');
    }
  };

  const normalizeDetails = (details) => {
    const base = createEmptyDetails();
    if (!details) return base;
    return {
      ...base,
      composition: details.composition || '',
      analysis: Array.isArray(details.analysis)
        ? details.analysis.map((row) => ({
            label: row?.label || '',
            value: row?.value || ''
          }))
        : [],
      feedingGuideTable: normalizeFeedingGuideTable(details.feedingGuideTable) || base.feedingGuideTable,
      accessorySpecs: normalizeAccessorySpecs(details.accessorySpecs),
      pharmacyInfo: normalizePharmacyInfo(details.pharmacyInfo)
    };
  };

  const isCompositionLong = (text = '') => text.trim().length > 160;

  const toggleCompositionExpand = (productId) => {
    setExpandedCompositions((prev) => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  const openDetailsModal = (product) => {
    if (!product) return;
    setSelectedProductDetails({
      product,
      details: normalizeDetails(product.details),
      cardKey: getProductCardKey(product)
    });
  };

  const closeDetailsModal = () => setSelectedProductDetails(null);

  const analysisRows = Array.isArray(formData.details?.analysis)
    ? formData.details.analysis
    : [];

  const feedingGuideTable = useMemo(
    () => normalizeFeedingGuideTable(formData.details?.feedingGuideTable) || createEmptyFeedingGuideTable(),
    [formData.details?.feedingGuideTable]
  );

  const accessorySpecs = useMemo(
    () => normalizeAccessorySpecs(formData.details?.accessorySpecs),
    [formData.details?.accessorySpecs]
  );

  const pharmacyInfo = useMemo(
    () => normalizePharmacyInfo(formData.details?.pharmacyInfo),
    [formData.details?.pharmacyInfo]
  );

  const isAccessoryCategory = formData.category === 'accesorios';
  const isPharmacyCategory = formData.category === 'farmacia';

  const parseAnalysisText = (text) => {
    if (!text) return [];
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const colonMatch = line.match(/(.+?)[\s]*[:\-]\s*(.+)/);
        if (colonMatch) {
          return {
            label: colonMatch[1].trim(),
            value: colonMatch[2].trim()
          };
        }
        const valueMatch = line.match(/(.*?)(\d+[^ ]*)$/);
        if (valueMatch) {
          return {
            label: valueMatch[1].trim(),
            value: valueMatch[2].trim()
          };
        }
        return { label: line, value: '' };
      });
  };

  const getFeedingGuideTableFromDetails = (details) => {
    const normalized = normalizeFeedingGuideTable(details?.feedingGuideTable);
    return cloneFeedingGuideTable(normalized || createEmptyFeedingGuideTable());
  };

  const updateFeedingGuideTable = (updater) => {
    setFormData((prev) => {
      const workingTable = getFeedingGuideTableFromDetails(prev.details);
      const updatedTable = updater(workingTable) || workingTable;
      return {
        ...prev,
        details: {
          ...prev.details,
          feedingGuideTable: cloneFeedingGuideTable(updatedTable)
        }
      };
    });
  };

  const handleFeedingGuideColumnChange = (columnIndex, value) => {
    updateFeedingGuideTable((table) => {
      if (columnIndex < 0 || columnIndex >= table.columns.length) {
        return table;
      }
      table.columns[columnIndex] = value;
      table.rows = table.rows.map((row) => ({
        ...row,
        values: table.columns.map((_, idx) => row.values[idx] ?? '')
      }));
      return table;
    });
  };

  const handleFeedingGuideRowLabelChange = (rowIndex, value) => {
    updateFeedingGuideTable((table) => {
      if (rowIndex < 0 || rowIndex >= table.rows.length) {
        return table;
      }
      table.rows[rowIndex].label = value;
      return table;
    });
  };

  const handleFeedingGuideCellChange = (rowIndex, columnIndex, value) => {
    updateFeedingGuideTable((table) => {
      if (
        rowIndex < 0 ||
        rowIndex >= table.rows.length ||
        columnIndex < 0 ||
        columnIndex >= table.columns.length
      ) {
        return table;
      }
      table.rows[rowIndex].values[columnIndex] = value;
      return table;
    });
  };

  const addFeedingGuideColumn = () => {
    updateFeedingGuideTable((table) => {
      table.columns.push('');
      table.rows = table.rows.map((row) => ({
        ...row,
        values: [...row.values, '']
      }));
      return table;
    });
  };

  const removeFeedingGuideColumn = (columnIndex) => {
    updateFeedingGuideTable((table) => {
      if (table.columns.length <= MIN_FEEDING_GUIDE_COLUMNS) {
        return table;
      }
      if (columnIndex < 0 || columnIndex >= table.columns.length) {
        return table;
      }
      table.columns.splice(columnIndex, 1);
      table.rows = table.rows.map((row) => ({
        ...row,
        values: row.values.filter((_, idx) => idx !== columnIndex)
      }));
      return table;
    });
  };

  const addFeedingGuideRow = () => {
    updateFeedingGuideTable((table) => {
      table.rows.push({
        label: '',
        values: table.columns.map(() => '')
      });
      return table;
    });
  };

  const removeFeedingGuideRow = (rowIndex) => {
    updateFeedingGuideTable((table) => {
      if (table.rows.length <= MIN_FEEDING_GUIDE_ROWS) {
        return table;
      }
      if (rowIndex < 0 || rowIndex >= table.rows.length) {
        return table;
      }
      table.rows.splice(rowIndex, 1);
      return table;
    });
  };

  const resetFeedingGuideTable = () => {
    updateFeedingGuideTable(() => createEmptyFeedingGuideTable());
  };

  const handleDetailsChange = (field, value) => {
    setFormData((prev) => {
      const prevDetails = prev.details || createEmptyDetails();
      return {
        ...prev,
        details: {
          ...prevDetails,
          [field]: value
        }
      };
    });
  };

  const handleAnalysisRowChange = (index, key, value) => {
    setFormData((prev) => {
      const analysis = Array.isArray(prev.details.analysis)
        ? [...prev.details.analysis]
        : [];
      analysis[index] = {
        ...analysis[index],
        [key]: value
      };
      return {
        ...prev,
        details: {
          ...prev.details,
          analysis
        }
      };
    });
  };

  const addAnalysisRow = () => {
    setFormData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        analysis: [
          ...(Array.isArray(prev.details.analysis) ? prev.details.analysis : []),
          { label: '', value: '' }
        ]
      }
    }));
  };

  const removeAnalysisRow = (index) => {
    setFormData((prev) => {
      const analysis = Array.isArray(prev.details.analysis)
        ? prev.details.analysis.filter((_, i) => i !== index)
        : [];
      return {
        ...prev,
        details: {
          ...prev.details,
          analysis
        }
      };
    });
  };

  const openTextScanner = (target) => {
    setTextScannerTarget(target);
    setShowTextScanner(true);
  };

  const closeTextScanner = () => {
    setShowTextScanner(false);
    setTextScannerTarget(null);
  };

  const handleTextScannerDetected = (text) => {
    if (!textScannerTarget || !text) return;
    if (textScannerTarget === 'composition') {
      handleDetailsChange('composition', text.trim());
    } else if (textScannerTarget === 'analysis') {
      const parsed = parseAnalysisText(text);
      setFormData((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          analysis: parsed
        }
      }));
    }
  };

  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setBrowserSupportsSpeechRecognition(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const target = voiceInputTargetRef.current || 'search';

        if (target === 'composition') {
          setFormData((prev) => {
            const prevDetails = prev.details || createEmptyDetails();
            const prevText = prevDetails.composition || '';
            const separator = prevText && !prevText.endsWith(' ') ? ' ' : '';
            return {
              ...prev,
              details: {
                ...prevDetails,
                composition: `${prevText}${separator}${transcript}`
              }
            };
          });
        } else {
          setSearchTerm(transcript);
        }

        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
        setIsListening(false);
        showAlert('Error al usar el micrófono. Asegúrate de otorgar los permisos necesarios.', 'error');
      };

      setSpeechRecognition(recognition);
    }
  }, []);

  useEffect(() => {
    if (!selectedProductDetails) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProductDetails]);

  // Visitor counter functionality removed

  const clearSearchTerm = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const toggleVoiceRecognition = (target = 'search') => {
    if (!browserSupportsSpeechRecognition) {
      showAlert('Tu navegador no soporta reconocimiento de voz', 'error');
      return;
    }

    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    } else {
      try {
        voiceInputTargetRef.current = target || 'search';
        speechRecognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error al iniciar el reconocimiento de voz:', err);
        showAlert('Error al acceder al micrófono. Por favor verifica los permisos.', 'error');
      }
    }
  };
  
  // Filtrar y ordenar productos
  const normalizeText = (text) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Unificar unidades de peso sueltas: k, kg, kilo, kilos, kgs -> kg
      .replace(/\b(k|kg|kilo|kilos|kgs?)\b/g, 'kg')
      // Unificar número + unidad: 12 kg, 12k, 12 kilos, 12kgs -> 12kg
      .replace(/(\d+)\s*(k|kg|kilo|kilos|kgs?)/g, '$1kg');
  const filteredProducts = useMemo(() => {
    console.log('Actualizando productos. Etapa de vida actual:', lifeStage);
    
    // Obtener todos los productos o filtrar por categoría
    let result = [];
    if (activeCategory === 'todos') {
      // Si es 'todos', aplanar el objeto de productos y asegurar que tengan precio
      result = Object.values(products)
        .flat()
        .filter(Boolean)
        .map(product => ({
          ...product,
          price: product.price || 0, // Asegurar que siempre haya un precio
          name: product.name || 'Producto sin nombre',
          stock: product.stock || 0,
          barcode: product.barcode || ''
        }));
    } else {
      // Si es una categoría específica, obtener solo esos productos
      result = (products[activeCategory] || []).map(product => ({
        ...product,
        price: product.price || 0, // Asegurar que siempre haya un precio
        name: product.name || 'Producto sin nombre',
        stock: product.stock || 0,
        barcode: product.barcode || ''
      }));
    }
    
    console.log('Productos a filtrar:', result);
    
    // Filtrar por término de búsqueda (todas las palabras, en cualquier orden)
    if (searchTerm) {
      const terms = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
      result = result.filter(product => {
        const name = normalizeText(product.name);
        return terms.every(term => name.includes(term));
      });
    }

    // Filtrar por precio
    if (priceFilter < 100000) {
      result = result.filter(product => product.price <= priceFilter);
    }

    // Filtrar por letra inicial
    if (letterFilter !== 'all') {
      result = result.filter(product => {
        const firstLetter = product.name.charAt(0).toUpperCase();
        return firstLetter === letterFilter.toUpperCase();
      });
    }

    // Filtrar por etapa de vida
    if (lifeStage !== 'all') {
      console.log('Filtrando por etapa de vida:', lifeStage);
      result = result.filter(product => {
        // Normalizar el nombre para hacer la búsqueda sin importar mayúsculas ni acentos
        const name = normalizeText(product.name); // Eliminar acentos
        
        // Palabras clave para cada etapa de vida
        const keywords = {
          cachorro: ['cachorro', 'puppy', 'cachorrito', 'cachorra', 'cachorros', 'kitten', 'kiten', 'gatito', 'gatitos'],
          adulto: ['adulto', 'adult', 'adulta', 'adultos', 'adultas'],
          senior: ['senior', 'sénior', 'anciano', 'mayor', 'veterano', 'golden']
        };
        
        // Verificar si alguna palabra clave coincide
        const matches = keywords[lifeStage].some(keyword => 
          name.includes(keyword)
        );
        
        console.log(`Producto: ${name} - ¿Coincide con ${lifeStage}?`, matches);
        return matches;
      });
      console.log('Productos después de filtrar:', result);
    }

    // Filtrar por cantidad de stock
    if (stockFilter !== 'all') {
      result = result.filter(product => {
        const stock = product.stock || 0;
        switch (stockFilter) {
          case 'out':
            return stock === 0;
          case 'low':
            return stock > 0 && stock <= 5;
          case 'medium':
            return stock > 5 && stock <= 20;
          case 'high':
            return stock > 20;
          default:
            return true;
        }
      });
    }

    // Ordenar
    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else {
      // Ordenar por nombre por defecto
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, activeCategory, searchTerm, priceFilter, lifeStage, sortBy, letterFilter, stockFilter]);

  // Función para manejar el cambio de categoría
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    // Mantener el término de búsqueda, solo resetear otros filtros
    // setSearchTerm(''); // Comentado para mantener el texto de búsqueda
    setPriceFilter(100000);
    setLifeStage('all');
    setSortBy('name');
    setLetterFilter('all');
  };

  const flatProducts = useMemo(() => {
    if (!products) return [];
    return Object.values(products)
      .filter(Array.isArray)
      .flat()
      .filter(Boolean);
  }, [products]);

  const formatCategoryLabel = (category) => {
    if (category === 'mascotasPequeñas') return 'Mascotas pequeñas';
    if (category === 'otros') return 'Otros';
    if (!category) return 'Sin categoría';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Trackear vistas de página
  useEffect(() => {
    const currentPath = activeCategory === 'todos' ? '/' : `/${activeCategory}`;
    trackPageView(currentPath);
  }, [activeCategory, trackPageView]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(loginData.username, loginData.password);
    if (result.success) {
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
      setLoginError('');
    } else {
      setLoginError(result.error || 'Error al iniciar sesión');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;
    
    addToCart(product);
    
    // Mostrar notificación
    showAlert(`¡${product.name} se ha añadido al carrito!`, 'success');
  };

  const handleAddWithAnimation = (product, e) => {
    e.preventDefault();
    
    // Activar animación
    setClickedButtons(prev => ({
      ...prev,
      [product.id]: true
    }));
    
    // Agregar al carrito
    handleAddToCart({ ...product, category: activeCategory });
    
    // Desactivar animación después de 500ms
    setTimeout(() => {
      setClickedButtons(prev => ({
        ...prev,
        [product.id]: false
      }));
    }, 500);
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 3000);
  };

  const handleToggleFeatured = async (product) => {
    if (!isAdmin || !product?.id) return;

    const category = product.category || activeCategory;
    if (!category) {
      showAlert('No se pudo determinar la categoría del producto', 'error');
      return;
    }

    try {
      setFeaturedProcessingId(product.id);
      const { id, category: _ignoredCategory, ...productData } = product;
      const updatedProduct = {
        ...productData,
        isFeatured: !product.isFeatured
      };
      await updateProduct(category, id, updatedProduct);
      showAlert(
        product.isFeatured
          ? `"${product.name}" se quitó del carrusel`
          : `"${product.name}" ahora es destacado`,
        'success'
      );
    } catch (error) {
      console.error('Error actualizando destacado:', error);
      showAlert('No se pudo actualizar el estado destacado', 'error');
    } finally {
      setFeaturedProcessingId(null);
    }
  };

  // Función para normalizar el precio (acepta formatos con y sin punto)
  const normalizePrice = (priceString) => {
    if (!priceString || priceString === '') return '';
    
    // Eliminar todo excepto números y puntos
    let cleanValue = priceString.replace(/[^0-9.]/g, '');
    
    // Si hay múltiples puntos, tratarlos como separadores de miles chilenos
    const parts = cleanValue.split('.');
    
    if (parts.length > 2) {
      // Si hay más de 2 puntos, todos son de miles excepto quizás el último
      // Ej: 1.234.567.89 -> 1234567.89
      const allButLast = parts.slice(0, -1).join(''); // Unir todas las partes excepto la última
      const lastPart = parts[parts.length - 1];
      
      // Si la última parte tiene 1-2 dígitos, es decimal; si tiene 3+, es miles
      if (lastPart.length <= 2) {
        cleanValue = allButLast + '.' + lastPart;
      } else {
        cleanValue = allButLast + lastPart; // Todos son miles
      }
    } else if (parts.length === 2) {
      // Si hay exactamente 2 puntos, determinar si el último es decimal o de miles
      const firstPart = parts[0];
      const lastPart = parts[1];
      
      // Si la última parte tiene 1-2 dígitos, es decimal
      // Si tiene 3+ dígitos, es separador de miles
      if (lastPart.length <= 2) {
        cleanValue = firstPart + '.' + lastPart; // Es decimal
      } else {
        cleanValue = firstPart + lastPart; // Es separador de miles
      }
    }
    
    // Limitar decimales a 2 dígitos
    const decimalParts = cleanValue.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      cleanValue = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
    }
    
    return cleanValue;
  };

  // Función para formatear el precio para mostrar (SOLO para display, no para guardar)
  const formatPriceForDisplay = (price) => {
    if (!price || price === '') return '';
    
    // Convertir a número para formatear
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return price; // Si no es número, devolver como está
    
    // Para valores sin decimales o con .00, mostrar sin decimales
    if (numPrice === Math.floor(numPrice)) {
      return numPrice.toLocaleString('es-CL');
    }
    
    // Para valores con decimales, mostrar con 2 decimales
    return numPrice.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    
    // Validar que no se guarde con categoría "todos"
    const categoryToUse = formData.category === 'todos' ? 'perros' : formData.category;
    
    const newProduct = {
      name: formData.name,
      price: Number(normalizePrice(formData.price)) || 0,
      image: formData.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(formData.name)}`,
      stock: Number(formData.stock) || 0,
      barcode: formData.barcode || '',
      details: formData.details
    };
    
    if (editingProduct) {
      // Usar la categoría del formulario en lugar de la categoría anterior
      updateProduct(categoryToUse, editingProduct.id, newProduct);
      showAlert(`"${newProduct.name}" actualizado exitosamente`, 'success');
    } else {
      addProduct(categoryToUse, newProduct);
      showAlert(`"${newProduct.name}" agregado exitosamente`, 'success');
    }
    
    setEditingProduct(null);
    setShowAddProduct(false);
  };

  const handleEditProduct = (product, category) => {
    const priceValue = product.price?.toString() || '';
    setFormData({
      name: product.name,
      price: priceValue,
      category: product.category || category,
      image: product.image,
      stock: product.stock || '',
      barcode: product.barcode || '',
      details: normalizeDetails(product.details)
    });
    // Sincronizar el display del precio
    setPriceDisplayValue(formatPriceForDisplay(priceValue));
    setEditingProduct({ id: product.id, category: product.category || category });
    setShowAddProduct(true);
  };

  const handleBarcodeProductDetected = (code) => {
    setFormData((prev) => ({
      ...prev,
      barcode: code
    }));
    setShowProductScanner(false);
    showAlert('Código de barras escaneado correctamente', 'success');
  };

  const handleBarcodeSearchDetected = (code) => {
    let foundProduct = null;
    let foundCategory = null;

    Object.entries(products).forEach(([category, items]) => {
      if (foundProduct) return;
      const match = (items || []).find((p) => p.barcode === code);
      if (match) {
        foundProduct = match;
        foundCategory = category;
      }
    });

    if (foundProduct && foundCategory) {
      setActiveCategory(foundCategory);
      setSearchTerm(foundProduct.name);
      setPriceFilter(100000);
      setLifeStage('all');
      setSortBy('name');
      setLetterFilter('all');
      showAlert(`Producto encontrado: "${foundProduct.name}"`, 'success');
    } else {
      showAlert('No se encontró ningún producto con ese código de barras', 'error');
    }

    setShowSearchScanner(false);
  };

  const handleDeleteProduct = (productId, category) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      deleteProduct(category, productId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900"
    >
      {/* Sistema de Alertas */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
          alert.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center">
            <span className="text-sm font-medium">
              {alert.type === 'success' ? '✓' : '✗'} {alert.message}
            </span>
          </div>
        </div>
      )}
      
      {/* Contenedor con imagen de fondo para header y carrusel */}
      <div className="relative">
        {/* Imagen de fondo del local */}
        <div className="absolute inset-0">
          <img
            src="https://i.ibb.co/XH7nD58/rancho.jpg"
            alt="Rancho de Mascotas Hualpén - Nuestro local"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-white/40 to-cyan-50/30" />
        </div>
        
        {/* Header */}
        <header className="bg-white/30 backdrop-blur-sm shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <a href="/" onClick={handleLogoClick} className="flex items-center space-x-2 cursor-pointer">
            {!headerLogoFailed ? (
              <Image
                src="https://i.ibb.co/twMHRJmQ/503853895-17910857019133345-7677598013054732096-n.jpg"
                alt="Logo Rancho de Mascotas Hualpén"
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 object-cover"
                onError={() => setHeaderLogoFailed(true)}
              />
            ) : (
              <div className="w-20 h-20 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">RM</span>
              </div>
            )}
            <h1 className="hidden sm:block text-lg sm:text-2xl font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Rancho Mascotas Hualpén
            </h1>
          </a>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href="/encuentrenos"
                className="px-2 py-1 text-xs sm:px-3 sm:py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Quienes Somos
              </Link>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-indigo-600 focus:outline-none"
                aria-label="Carrito de compras"
              >
                <CartIcon />
              </button>
            
            {!user ? (
              <button 
                onClick={() => setShowLogin(true)}
                className="px-2 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs sm:text-sm"
              >
                Admin
              </button>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Hola, {user.username}</span>
                <button 
                  onClick={handleLogout}
                  className="px-2 sm:px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs sm:text-sm"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      <FeaturedProductsCarousel onProductSelect={navigateToProduct} />
      
      </div> {/* Cierre del contenedor con imagen de fondo */}

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-indigo-700 rounded-lg shadow-xl overflow-hidden mb-6 sm:mb-8 lg:mb-12">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white lg:text-4xl text-center lg:text-left mobile-headline-white">
                  <span className="block">Todo para tus mascotas</span>
                  <span className="block text-indigo-200">En un solo lugar</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm sm:text-lg text-indigo-100 text-center lg:text-left">
                  Encuentra los mejores productos para el cuidado y entretenimiento de tus mascotas.
                </p>
              </div>
              <div className="mt-8 relative lg:mt-0">
                <div className="relative mx-auto w-full rounded-lg shadow-lg">
                  <div className="relative block w-full bg-white rounded-lg overflow-hidden">
                    <div className="relative w-full h-48 sm:h-64">
                      <Image
                        src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
                        alt="Mascotas felices"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Nuestros Productos</h2>
          
          {/* Filtros de categoría */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8">
            <button
              onClick={() => handleCategoryChange('todos')}
              className={`group relative w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-all duration-300 transform hover:scale-110 hover:shadow-xl overflow-hidden border-4 bg-gradient-to-br from-gray-400 to-gray-500 ${
                activeCategory === 'todos'
                  ? 'border-yellow-400 shadow-lg scale-105'
                  : 'border-transparent hover:border-yellow-300'
              }`}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 group-hover:bg-white/10 transition-colors" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                <div className="text-2xl sm:text-3xl mb-1">🏪</div>
                <span className="text-xs sm:text-sm font-semibold">Todos</span>
              </div>
            </button>

            {Object.keys(products || {}).filter(category => 
              ['perros', 'gatos', 'mascotasPequeñas', 'accesorios', 'farmacia'].includes(category)
            ).map((category) => {
              const categoryConfig = {
                perros: {
                  emoji: '🐕',
                  label: 'Perros',
                  bgGradient: 'from-blue-500 to-cyan-600',
                  activeBgGradient: 'from-red-500 to-red-600',
                  hoverGradient: 'from-blue-600 to-cyan-700',
                  image: '/images/dog-section.svg'
                },
                gatos: {
                  emoji: '🐱',
                  label: 'Gatos',
                  bgGradient: 'from-pink-500 to-rose-600',
                  activeBgGradient: 'from-indigo-500 to-purple-600',
                  hoverGradient: 'from-pink-600 to-rose-700',
                  image: '/images/cat-section.svg'
                },
                mascotasPequeñas: {
                  emoji: '🐹',
                  label: 'Mascotas Pequeñas',
                  bgGradient: 'from-green-500 to-emerald-600',
                  activeBgGradient: 'from-amber-700 to-amber-800',
                  hoverGradient: 'from-green-600 to-emerald-700',
                  image: '/images/small-pets-section.svg'
                },
                accesorios: {
                  emoji: '🎾',
                  label: 'Accesorios',
                  bgGradient: 'from-orange-500 to-amber-600',
                  activeBgGradient: 'from-teal-500 to-cyan-600',
                  hoverGradient: 'from-orange-600 to-amber-700',
                  image: '/images/accessories-section.svg'
                },
                farmacia: {
                  emoji: '💊',
                  label: 'Farmacia',
                  bgGradient: 'from-purple-500 to-violet-600',
                  activeBgGradient: 'from-gray-500 to-slate-600',
                  hoverGradient: 'from-purple-600 to-violet-700',
                  image: '/images/pharmacy-section.svg'
                }
              };

              const config = categoryConfig[category];
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`group relative w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-all duration-300 transform hover:scale-110 hover:shadow-xl overflow-hidden border-4 bg-gradient-to-br ${
                    isActive
                      ? `${config.bgGradient} border-yellow-400 shadow-lg scale-105`
                      : `${config.bgGradient} border-transparent hover:border-yellow-300`
                  }`}
                >
                  <div className="absolute inset-0 rounded-full bg-white/20 group-hover:bg-white/10 transition-colors" />
                  <div className="absolute inset-0 opacity-30 group-hover:opacity-20 transition-opacity">
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${config.image})` }} />
                  </div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                    <div className="text-2xl sm:text-3xl mb-1 drop-shadow-lg">{config.emoji}</div>
                    <span className="text-xs sm:text-sm font-semibold drop-shadow">{config.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Barra de búsqueda y filtros */}
          <div className="mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 relative">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              {/* Buscador */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="relative flex items-center">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="🔍 Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-12 py-3 border-2 border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base font-medium shadow-sm focus:shadow-md transition-all duration-200 hover:border-gray-400"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={clearSearchTerm}
                      className="absolute right-10 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                      aria-label="Limpiar búsqueda"
                      title="Limpiar búsqueda"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 8.586l2.95-2.95a1 1 0 111.414 1.414L11.414 10l2.95 2.95a1 1 0 01-1.414 1.414L10 11.414l-2.95 2.95a1 1 0 01-1.414-1.414L8.586 10l-2.95-2.95A1 1 0 017.05 5.636L10 8.586z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleVoiceRecognition('search')}
                    className={`absolute right-2 p-1 rounded-full ${
                      isListening && voiceInputTargetRef.current === 'search'
                        ? 'bg-red-100 text-red-600'
                        : 'text-gray-500 hover:text-indigo-600'
                    }`}
                    aria-label="Buscar por voz"
                    title="Buscar por voz"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-6 w-6" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                      />
                    </svg>
                  </button>
                  {isListening && voiceInputTargetRef.current === 'search' && (
                    <span className="absolute right-20 text-sm text-red-600 animate-pulse">
                      Escuchando...
                    </span>
                  )}
                </div>
              </div>
              
              {/* Filtro por precio */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Precio máximo: ${priceFilter.toLocaleString('es-CL')}
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${((priceFilter - 500) / (100000 - 500)) * 100}%, #e5e7eb ${((priceFilter - 500) / (100000 - 500)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$500</span>
                    <span>$100.000</span>
                  </div>
                </div>
              </div>
              
              {/* Filtro por etapa de vida */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Etapa de vida</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Cambiando etapa de vida a: all');
                      setLifeStage('all');
                    }}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      lifeStage === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Cambiando etapa de vida a: cachorro');
                      setLifeStage('cachorro');
                    }}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      lifeStage === 'cachorro'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cachorro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Cambiando etapa de vida a: adulto');
                      setLifeStage('adulto');
                    }}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      lifeStage === 'adulto'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Adulto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Cambiando etapa de vida a: senior');
                      setLifeStage('senior');
                    }}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      lifeStage === 'senior'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Senior
                  </button>
                </div>
              </div>

              {/* Filtro por cantidad de stock (solo para usuarios logueados) */}
              {user && (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Cantidad de Stock</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStockFilter('all')}
                      className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                        stockFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      📦 Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('out')}
                      className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                        stockFilter === 'out'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🚫 Sin Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('low')}
                      className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                        stockFilter === 'low'
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ⚠️ Bajo (1-5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('medium')}
                      className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                        stockFilter === 'medium'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      📊 Medio (6-20)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('high')}
                      className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                        stockFilter === 'high'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ✅ Alto (20+)
                    </button>
                  </div>
                  {stockFilter !== 'all' && (
                    <div className="mt-2 text-xs text-gray-600">
                      {stockFilter === 'out' && 'Mostrando productos agotados'}
                      {stockFilter === 'low' && 'Mostrando productos con stock bajo (crítico)'}
                      {stockFilter === 'medium' && 'Mostrando productos con stock medio'}
                      {stockFilter === 'high' && 'Mostrando productos con stock alto'}
                    </div>
                  )}
                </div>
              )}

              {/* Filtro alfabético */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Filtrar por letra</label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setLetterFilter('all')}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      letterFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setLetterFilter(letter)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        letterFilter === letter
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ordenar por precio */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Ordenar por precio</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSortBy('price-asc')}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      sortBy === 'price-asc'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Menor a mayor
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('price-desc')}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      sortBy === 'price-desc'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Mayor a menor
                  </button>
                </div>
              </div>
            </div>
            
            {/* Botón flotante de reinicio de filtros */}
            {(searchTerm || priceFilter < 100000 || lifeStage !== 'all' || letterFilter !== 'all' || sortBy !== 'name') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPriceFilter(100000);
                  setLifeStage('all');
                  setLetterFilter('all');
                  setSortBy('name');
                }}
                className="absolute bottom-16 right-2 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover:scale-110"
                title="Reiniciar todos los filtros"
                aria-label="Reiniciar todos los filtros"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            )}
            
            {/* Contador de resultados */}
            <div className="mt-3 text-xs sm:text-sm text-gray-500">
              Mostrando {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {searchTerm && ` para "${searchTerm}"`}
              {stockFilter !== 'all' && user && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  stockFilter === 'out' ? 'bg-red-100 text-red-700' :
                  stockFilter === 'low' ? 'bg-amber-100 text-amber-700' :
                  stockFilter === 'medium' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {stockFilter === 'out' && '🚫 Sin Stock'}
                  {stockFilter === 'low' && '⚠️ Stock Bajo'}
                  {stockFilter === 'medium' && '📊 Stock Medio'}
                  {stockFilter === 'high' && '✅ Stock Alto'}
                </span>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSearchScanner(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h4" />
                  <path d="M16 4h4" />
                  <path d="M4 20h4" />
                  <path d="M16 20h4" />
                  <rect x="5" y="7" width="14" height="10" rx="2" ry="2" />
                </svg>
                <span className="ml-1">Escanear código</span>
              </button>
            </div>
          </div>

          {user && (
            <section className="mb-6 bg-white/95 sm:dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-100 sm:dark:border-gray-800 shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 sm:dark:text-white">Panel de Estadísticas y Analíticas</h3>
                  <p className="text-sm text-gray-500 sm:dark:text-gray-400">Métricas clave para el crecimiento del negocio</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Última actualización:</span>
                  <span className="text-xs font-medium text-gray-700">{new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Métricas Principales del Sitio */}
              <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-gradient-to-br from-blue-50 to-indigo-50 sm:dark:from-blue-900/20 sm:dark:to-indigo-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide text-gray-600">Visitantes Mensuales</p>
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2a3 3 0 002 2h2a2 2 0 002 2v10m-6 0a2 2 0 002 2h2a2 2 0 002 2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">{(realTimeData.visitors || 0).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
                </div>
                
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-gradient-to-br from-green-50 to-emerald-50 sm:dark:from-green-900/20 sm:dark:to-emerald-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide text-gray-600">Páginas Vistas</p>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">{(realTimeData.pageViews || 0).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-500 mt-1">Total vistas</p>
                </div>
                
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-gradient-to-br from-green-500 to-green-600 sm:dark:from-green-600 sm:dark:to-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide text-white">Pedidos WhatsApp</p>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-white">{(realTimeData.whatsappOrdersCount || 0).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-green-100 mt-1">Enviados</p>
                </div>
                
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-gradient-to-br from-amber-50 to-orange-50 sm:dark:from-amber-900/20 sm:dark:to-orange-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide text-gray-600">Productos Totales</p>
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4M2 17l8-4 8 4M3 21h18M12 17v4" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">{(realTimeData.totalProducts || 0).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-500 mt-1">En catálogo</p>
                </div>
                
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-gradient-to-br from-purple-50 to-pink-50 sm:dark:from-purple-900/20 sm:dark:to-pink-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wide text-gray-600">Valor Inventario</p>
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343.895 3 3 .895 3 3-3 .895-3-3zm0 2h.01M12 15v.01M9 12h6m-6 4h6" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">$ {(realTimeData.inventoryValue || 0).toLocaleString('es-CL')}</p>
                  <p className="text-xs text-gray-500 mt-1">Valor total</p>
                </div>
              </div>

              {/* Distribución por Categorías */}
              <div className="mt-6 p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900 sm:dark:text-white">Distribución del Catálogo</h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600">Categorías</span>
                </div>
                
                {/* Gráfica de Pastel Completa */}
                <div className="flex justify-center mb-4">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full chart-svg" viewBox="0 0 100 100">
                      {realTimeData.categoryDistribution?.map((category, index) => {
                        const percentage = parseFloat(category.percentage) || 0;
                        const circumference = 2 * Math.PI * 45;
                        const strokeDasharray = `${percentage * circumference / 100} ${circumference}`;
                        
                        // Calcular el ángulo de rotación para cada segmento
                        let rotation = 0;
                        for (let i = 0; i < index; i++) {
                          rotation += parseFloat(realTimeData.categoryDistribution[i]?.percentage || 0) * 3.6; // Convertir porcentaje a grados
                        }
                        
                        const colors = [
                          '#3B82F6', // Azul para Perros
                          '#EC4899', // Rosa para Gatos  
                          '#10B981', // Verde para Mascotas Pequeñas
                          '#F97316', // Naranja para Accesorios
                          '#8B5CF6'  // Púrpura para Farmacia
                        ];
                        
                        return (
                          <circle
                            key={category.category}
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={colors[index % colors.length]}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            transform={`rotate(${rotation} 50 50)`}
                            className="transition-all duration-300"
                            style={{
                              transformOrigin: 'center',
                              transform: `rotate(${rotation}deg)`,
                            }}
                          />
                        );
                      })}
                      
                      {/* Centro con información */}
                      <circle cx="50" cy="50" r="25" fill="white" className="sm:dark:fill-gray-900" />
                      <text x="50" y="45" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-gray-700 sm:dark:fill-gray-300">
                        {realTimeData.totalProducts?.toLocaleString('es-CL')}
                      </text>
                      <text x="50" y="58" textAnchor="middle" dominantBaseline="middle" className="text-xs fill-gray-500 sm:dark:fill-gray-500">
                        productos
                      </text>
                    </svg>
                  </div>
                </div>
                
                {/* Leyenda de Categorías */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {realTimeData.categoryDistribution?.map((category, index) => {
                    const colors = [
                      'bg-blue-100 text-blue-600 border-blue-200',
                      'bg-pink-100 text-pink-600 border-pink-200', 
                      'bg-green-100 text-green-600 border-green-200',
                      'bg-orange-100 text-orange-600 border-orange-200',
                      'bg-purple-100 text-purple-600 border-purple-200'
                    ];
                    
                    return (
                      <div key={category.category} className={`p-3 rounded-lg border ${colors[index % colors.length]}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          <span className="text-xs font-bold">{category.percentage}%</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>{category.count?.toLocaleString('es-CL')} productos</div>
                          <div>Precio prom: $ {(category.avgPrice || 0).toLocaleString('es-CL')}</div>
                          <div>Stock: {category.stock?.toLocaleString('es-CL') || '0'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Métricas Adicionales */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900 sm:dark:text-white">Stock Crítico</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">Alerta</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sin stock</span>
                      <span className="text-sm font-bold text-red-600">{realTimeData.outOfStockProducts || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bajo stock</span>
                      <span className="text-sm font-bold text-amber-600">{realTimeData.lowStockProducts || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900 sm:dark:text-white">Rendimiento</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">Métricas</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tasa Rebote</span>
                      <span className="text-sm font-bold text-gray-900">{(realTimeData.bounceRate || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duración Sesión</span>
                      <span className="text-sm font-bold text-gray-900">{Math.floor((realTimeData.avgSessionDuration || 0) / 60)}:{((realTimeData.avgSessionDuration || 0) % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900 sm:dark:text-white">Precio Promedio</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-600">Catálogo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Por producto</span>
                      <span className="text-sm font-bold text-gray-900">$ {(realTimeData.avgProductPrice || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stock total</span>
                      <span className="text-sm font-bold text-gray-900">{(realTimeData.totalStock || 0).toLocaleString('es-CL')} unidades</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas de Analytics */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Estadísticas del Sitio</h4>
                      <p className="text-sm text-gray-600">Métricas de tráfico y visitantes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Activo</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Última actualización: {new Date().toLocaleTimeString('es-CL')}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {loading ? (
            <div className="col-span-full py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Cargando productos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-8 sm:py-12 text-center">
                <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">Intenta con otros términos de búsqueda o filtros.</p>
                {(searchTerm || priceFilter < 100000) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPriceFilter(100000);
                      setLifeStage('all');
                      setLetterFilter('all');
                    }}
                    className="mt-4 inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => {
                const productCardKey = getProductCardKey(product);
                const productDetails = normalizeDetails(product.details);
                const hasComposition = Boolean(productDetails.composition?.trim());
                const hasAnalysis = Array.isArray(productDetails.analysis) && productDetails.analysis.length > 0;
                const hasFeedingGuideTable = hasFeedingGuideTableData(productDetails.feedingGuideTable);
                const hasDetails = hasComposition || hasAnalysis || hasFeedingGuideTable;
                const highlightedAnalysis = productDetails.analysis || [];
                const compositionExpanded = expandedCompositions[productCardKey];
                const showReadMore = hasComposition && isCompositionLong(productDetails.composition);
                const formattedCategory = formatCategoryLabel(product.category || activeCategory);
                const showSku = Boolean(user);
                const cardCategory = product.category || activeCategory;
                const isAccessoryCard = cardCategory === 'accesorios';
                const isPharmacyCard = cardCategory === 'farmacia';
                const detailCardLabel = isAccessoryCard
                  ? 'Descripción del producto'
                  : isPharmacyCard
                  ? 'Información del medicamento'
                  : 'Información nutricional disponible';
                const fallbackMeta = [
                  {
                    label: 'Categoría',
                    value: formattedCategory
                  },
                  showSku && product.barcode && {
                    label: 'Código',
                    value: product.barcode
                  },
                  product.brand && {
                    label: 'Marca',
                    value: product.brand
                  }
                ].filter(Boolean);
                const isInCart = Array.isArray(cart) && cart.some((item) => item.id === product.id);

                const isShareMenuOpen = shareMenuContext?.cardKey === productCardKey;

                return (
                <div
                  key={productCardKey || product.id}
                  id={getProductAnchorId(product)}
                  className={`group rounded-2xl overflow-hidden flex flex-col transition-all duration-300 border ${
                    isInCart
                      ? 'bg-orange-50/90 border-orange-400 shadow-xl shadow-orange-100 dark:bg-orange-900/30 dark:border-orange-600 dark:shadow-orange-900/40'
                      : 'bg-white/95 border-gray-100 shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] dark:bg-slate-800/80 dark:border-slate-700 dark:shadow-[0_20px_40px_rgba(15,23,42,0.35)]'
                  }`}
                >
                  <div className="w-full h-40 sm:h-48 bg-white dark:bg-slate-900 overflow-hidden border-b border-gray-200 dark:border-slate-700">
                    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                      {product.image ? (
                        <div className="relative w-full h-full">
                          <button
                            onClick={() => navigateToProduct(product)}
                            className="w-full h-full flex items-center justify-center p-2 sm:p-4 hover:opacity-80 transition-opacity"
                          >
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              unoptimized
                            className="object-contain"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            onError={(event) => {
                              const target = event.currentTarget;
                              target.onerror = null;
                              target.src = 'https://via.placeholder.com/150?text=Sin+imagen';
                            }}
                          />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-slate-800">
                          <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Sin imagen</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-h-[80px] sm:min-h-[96px]">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 dark:text-gray-300">
                          {formattedCategory}
                        </p>
                        <p className="text-base sm:text-lg font-semibold text-black dark:text-black mt-1 mb-1 line-clamp-2">
                          {product.name}
                        </p>
                      </div>
                      <div className="relative flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => toggleShareMenuForProduct(product)}
                          data-share-trigger
                          className={`p-2 rounded-full border text-gray-500 transition-colors dark:text-gray-300 ${
                            isShareMenuOpen
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-500/20'
                              : 'border-gray-200 hover:bg-gray-100 hover:text-gray-900 dark:border-slate-600 dark:hover:bg-slate-700'
                          }`}
                          title="Compartir producto"
                          aria-label="Compartir producto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-black">
                            <path d="M18 7a3 3 0 10-2.686-4.24l-6.3 3.51a3 3 0 100 4.46l6.3 3.51a3 3 0 102.012-1.932l-6.207-3.46a3.02 3.02 0 000-.698l6.207-3.46A2.99 2.99 0 0018 7zM6 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm12 8.5a1.5 1.5 0 11-1.5 1.5 1.5 1.5 0 011.5-1.5zm0-14a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 0118 3.5z" />
                          </svg>
                        </button>
                        {isShareMenuOpen && shareMenuContext?.shareData && (
                          <div
                            data-share-menu
                            className="absolute top-10 right-0 z-30 w-56 rounded-2xl border border-gray-200 bg-white p-3 text-sm shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-2">
                              Compartir este producto
                            </p>
                            <div className="space-y-1">
                              {supportsNativeShare && (
                                <button
                                  type="button"
                                  onClick={() => handleNativeShare(product, shareMenuContext.shareData)}
                                  className="flex w-full items-center justify-between rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                                >
                                  Compartir en apps
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a1 1 0 011 1v8a1 1 0 11-2 0V3a1 1 0 011-1z" />
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                    <path d="M4 13a1 1 0 100 2h12a1 1 0 100-2H4z" />
                                  </svg>
                                </button>
                              )}
                              {SOCIAL_SHARE_OPTIONS.map((option) => {
                                const isCopyMode = option.mode === 'copy';
                                return (
                                  <button
                                    key={`${option.id}-${productCardKey}`}
                                    type="button"
                                    onClick={() =>
                                      isCopyMode
                                        ? handleCopyShareLink(product, shareMenuContext.shareData)
                                        : handleShareOptionClick(option, shareMenuContext.shareData)
                                    }
                                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${option.accentClass}`}
                                  >
                                    <span>{option.label}</span>
                                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/80 p-1 text-gray-600 dark:bg-white/10 dark:text-gray-200">
                                      {option.icon}
                                    </span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => handleCopyShareLink(product, shareMenuContext.shareData)}
                                className="flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                              >
                                Copiar enlace
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {product.brand && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700 whitespace-nowrap">
                            {product.brand}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 p-4 text-white shadow-inner">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-100/80">Precio</p>
                          <p className="text-2xl font-semibold leading-tight">
                            ${(product.price || 0).toLocaleString('es-CL')}
                          </p>
                          {showSku && product.barcode && (
                            <p className="text-[10px] text-indigo-100/90 mt-1">SKU {product.barcode}</p>
                          )}
                        </div>
                        <button 
                          onClick={(e) => handleAddWithAnimation(product, e)}
                          disabled={product.stock <= 0}
                          className={`ml-4 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                            product.stock > 0 
                              ? 'bg-white text-indigo-600 hover:bg-indigo-50' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          } ${
                            clickedButtons[product.id] ? 'animate-ping' : ''
                          }`}
                        >
                          <span className={clickedButtons[product.id] ? 'opacity-0' : 'opacity-100'}>
                            {product.stock > 0 ? 'Agregar' : 'Agotado'}
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Estado del stock */}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {product.stock > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Stock disponible{user && ` (${product.stock})`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700">
                          Agotado temporalmente
                        </span>
                      )}
                      {isInCart && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2 5h14M10 21a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z"
                            />
                          </svg>
                          <span>En carrito</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex-1">
                      {hasDetails ? (
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100 shadow-sm">
                          <p className="text-[12px] font-semibold mb-2">{detailCardLabel}</p>
                          <Link
                            href={`/producto/${product.slug || generateSlug(product.name)}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white dark:text-white btn-text-white shadow hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors duration-200"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="btn-text-white-text">Ver detalles completos</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H5m14 0h-4m0 0V8m0 4v4" />
                            </svg>
                          </Link>
                        </div>
                      ) : (
                        <div className="text-xs bg-gradient-to-br from-gray-50 via-white to-white border border-gray-100 rounded-2xl p-4 h-fit shadow-sm dark:bg-gray-900/60 dark:border-gray-700">
                          <p className="text-gray-500 uppercase tracking-wide text-[11px] font-semibold mb-3 dark:text-gray-300">
                            Información general
                          </p>
                          <dl className="space-y-2 text-gray-700 dark:text-gray-200">
                            {fallbackMeta
                              .filter((meta) => Boolean(meta?.value))
                              .map((meta) => (
                                <div key={`${product.id}-${meta.label}`} className="flex items-center justify-between text-[11px]">
                                  <dt className="font-semibold text-gray-500 dark:text-gray-400">{meta.label}</dt>
                                  <dd className="text-gray-900 dark:text-gray-100">{meta.value}</dd>
                                </div>
                              ))}
                          </dl>
                          {fallbackMeta.length === 0 && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              Añade análisis o composición para completar esta tarjeta.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-100 bg-gray-50 flex justify-end items-center gap-2 dark:border-slate-700 dark:bg-slate-900/60">
                    {user && (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleFeatured(product)}
                            disabled={featuredProcessingId === product.id}
                            className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                              product.isFeatured
                                ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                                : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
                            } ${featuredProcessingId === product.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {featuredProcessingId === product.id
                              ? 'Actualizando...'
                              : product.isFeatured
                                ? 'Quitar del carrusel'
                                : 'Destacar'}
                          </button>
                        )}
                        <div className="flex space-x-1 sm:space-x-2">
                          <button 
                          onClick={() => handleEditProduct(product, activeCategory)}
                          className="p-1 text-yellow-600 hover:text-yellow-700"
                          title="Editar producto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.793.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id, activeCategory)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Eliminar producto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )})
            )}
          </div>
          )}
        </div>

      {user && (
          <div className="fixed bottom-4 left-4 z-30">
            <button 
              onClick={() => {
                setEditingProduct(null);
                // Si está en "todos", inicializar con "perros" por defecto
                const defaultCategory = activeCategory === 'todos' ? 'perros' : activeCategory;
                setFormData(createEmptyFormData(defaultCategory));
                setPriceDisplayValue(''); // Resetear el display del precio
                setShowAddProduct(true);
              }}
              className="p-3 sm:p-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        )}

        {selectedProductDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeDetailsModal}></div>
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Información del producto</p>
                  <h3 className="mt-1 text-2xl font-semibold text-gray-900">{selectedProductDetails.product.name}</h3>
                  <p className="text-sm text-gray-500">{formatCategoryLabel(selectedProductDetails.product.category || activeCategory)}</p>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                  aria-label="Cerrar"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`mt-6 grid gap-4 ${user ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Precio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${selectedProductDetails.product.price.toLocaleString('es-CL')}
                  </p>
                  {user && selectedProductDetails.product.barcode && (
                    <p className="text-xs text-gray-500 mt-1">SKU {selectedProductDetails.product.barcode}</p>
                  )}
                </div>
                {user && (
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {selectedProductDetails.product.stock ?? '—'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    handleAddToCart({
                      ...selectedProductDetails.product,
                      category: selectedProductDetails.product.category || activeCategory
                    })
                  }
                  disabled={selectedProductDetails.product.stock <= 0}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow ${
                    selectedProductDetails.product.stock > 0
                      ? 'bg-indigo-600 text-white dark:text-white btn-text-white hover:bg-indigo-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3h2l.4 2M7 13h12l2-8H6.4M7 13l-2 8h12M10 21a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                  <span className={selectedProductDetails.product.stock > 0 ? 'btn-text-white-text' : ''}>
                    {selectedProductDetails.product.stock > 0 ? 'Agregar al carrito' : 'Producto agotado'}
                  </span>
                </button>
              </div>

              <div className="mt-6 space-y-6 text-sm">
                {selectedProductDetails.product.category === 'accesorios' ? (
                  // Sección para accesorios
                  <section>
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Especificaciones del accesorio</h4>
                      <div className="space-y-3">
                        {selectedProductDetails.details.accessorySpecs?.type && (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-700 mb-1 border-b border-gray-100 pb-1">TIPO</span>
                            <p className="text-gray-700 mt-1">{selectedProductDetails.details.accessorySpecs.type}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.accessorySpecs?.dimensions && (
                          <div className="pt-3">
                            <span className="text-sm font-semibold text-gray-700 mb-1 border-b border-gray-100 pb-1 block">MEDIDAS</span>
                            <p className="text-gray-700 mt-1">{selectedProductDetails.details.accessorySpecs.dimensions}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.accessorySpecs?.color && (
                          <div className="pt-3">
                            <span className="text-sm font-semibold text-gray-700 mb-1 border-b border-gray-100 pb-1 block">COLOR</span>
                            <p className="text-gray-700 mt-1">{selectedProductDetails.details.accessorySpecs.color}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.accessorySpecs?.material && (
                          <div className="pt-3">
                            <span className="text-sm font-semibold text-gray-700 mb-1 border-b border-gray-100 pb-1 block">MATERIAL</span>
                            <p className="text-gray-700 mt-1">{selectedProductDetails.details.accessorySpecs.material}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.accessorySpecs?.recommendedPet && (
                          <div className="pt-3">
                            <span className="text-sm font-semibold text-gray-700 mb-1 border-b border-gray-100 pb-1 block">MASCOTA RECOMENDADA</span>
                            <p className="text-gray-700 mt-1">{selectedProductDetails.details.accessorySpecs.recommendedPet}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.accessorySpecs?.highlights && (
                          <div className="pt-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">CARACTERÍSTICAS DESTACADAS</p>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedProductDetails.details.accessorySpecs.highlights}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ) : selectedProductDetails.product.category === 'farmacia' ? (
                  // Sección para farmacia
                  <section>
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Ficha del medicamento</h4>
                      <div className="space-y-3">
                        {selectedProductDetails.details.pharmacyInfo?.productType && (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-700 mb-1 border-b border-gray-100 pb-1">TIPO DE PRODUCTO</span>
                            <p className="text-gray-700 mt-1">{selectedProductDetails.details.pharmacyInfo.productType}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.pharmacyInfo?.indications && (
                          <div className="pt-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">INDICACIONES</p>
                            <p className="text-gray-700 leading-relaxed">{selectedProductDetails.details.pharmacyInfo.indications}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.pharmacyInfo?.usage && (
                          <div className="pt-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">MODO DE USO / ADMINISTRACIÓN</p>
                            <p className="text-gray-700 leading-relaxed">{selectedProductDetails.details.pharmacyInfo.usage}</p>
                          </div>
                        )}
                        {selectedProductDetails.details.pharmacyInfo?.contraindications && (
                          <div className="pt-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">CONTRAINDICACIONES</p>
                            <p className="text-gray-700 leading-relaxed">{selectedProductDetails.details.pharmacyInfo.contraindications}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  // Sección para otros productos (composición, análisis, guía de alimentación)
                  <>
                    {(!selectedProductDetails.name.toLowerCase().includes('arena')) && selectedProductDetails.details.analysis?.length > 0 && (
                      <section>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h6" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2z" />
                            </svg>
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Análisis garantizado</p>
                            <h4 className="text-lg font-semibold text-gray-900">Valores nutricionales</h4>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProductDetails.details.analysis.map((row, idx) => (
                            <span
                              key={`${selectedProductDetails.cardKey}-analysis-${idx}`}
                              className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-700"
                            >
                              {row.label && <span className="mr-1">{row.label}:</span>}
                              <span>{row.value}</span>
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {(!selectedProductDetails.name.toLowerCase().includes('arena')) && selectedProductDetails.details.composition?.trim() && (
                      <section>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Composición</p>
                        <div className="mt-2 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4">
                          <p
                            className={`text-sm leading-relaxed text-gray-600 whitespace-pre-line ${
                              expandedCompositions[selectedProductDetails.cardKey] ? '' : 'line-clamp-5'
                            }`}
                          >
                            {selectedProductDetails.details.composition}
                          </p>
                          {isCompositionLong(selectedProductDetails.details.composition) && (
                            <button
                              type="button"
                              onClick={() => toggleCompositionExpand(selectedProductDetails.cardKey)}
                              className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              {expandedCompositions[selectedProductDetails.cardKey] ? 'Mostrar menos' : 'Ver más'}
                            </button>
                          )}
                        </div>
                      </section>
                    )}

                    {(!selectedProductDetails.name.toLowerCase().includes('arena')) && hasFeedingGuideTableData(selectedProductDetails.details.feedingGuideTable) && (
                      <section>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Guía de ración diaria</p>
                        <div className="mt-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                          <table className="min-w-full text-[12px] text-gray-600">
                            <thead className="bg-gray-50 text-gray-500">
                              <tr>
                                {selectedProductDetails.details.feedingGuideTable.columns.map((column, columnIndex) => (
                                  <th
                                    key={`modal-fg-column-${columnIndex}`}
                                    className="px-3 py-2 text-left text-sm font-semibold border-b border-gray-100"
                                  >
                                    {column || `Columna ${columnIndex + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {selectedProductDetails.details.feedingGuideTable.rows.map((row, rowIndex) => (
                                <tr key={`modal-fg-row-${rowIndex}`}>
                                  {row.values.map((value, columnIndex) => (
                                    <td key={`modal-fg-cell-${rowIndex}-${columnIndex}`} className="px-3 py-2 align-top">
                                      {value || '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}

                    {!selectedProductDetails.details.analysis?.length &&
                      !selectedProductDetails.details.composition?.trim() &&
                      !hasFeedingGuideTableData(selectedProductDetails.details.feedingGuideTable) && (
                        <p className="text-sm text-gray-500">
                          No se encontró información disponible para este producto.
                        </p>
                      )}
                  </>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={closeDetailsModal}
                  className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Iniciar sesión como administrador</h3>
                <button 
                  onClick={() => {
                    setShowLogin(false);
                    setLoginError('');
                    setLoginData({ username: '', password: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleLogin}>
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    required
                  />
                </div>
                
                <div className="mb-4 sm:mb-6">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    required
                  />
                </div>
                
                {loginError && (
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs sm:text-sm text-red-600">{loginError}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Iniciar sesión
                </button>
              </form>
            </div>
          </div>
        )}

        {showAddProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddProduct(false);
                    setFormData({
                      name: '',
                      price: '',
                      category: 'perros',
                      image: '',
                      stock: '',
                      barcode: ''
                    });
                    setEditingProduct(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddProduct} className="space-y-5">
                {/* Sección Información Básica */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Información Básica</h3>
                      <p className="text-sm text-gray-600">Datos principales del producto</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="product-name" className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Nombre del Producto
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="product-name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                          placeholder="Ej: Alimento Premium para Perros Adultos"
                          required
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="product-price" className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Precio
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-semibold">$</span>
                          </div>
                          <input
                            type="text"
                            id="product-price"
                            value={priceDisplayValue}
                            onChange={(e) => {
                              const displayValue = e.target.value;
                              setPriceDisplayValue(displayValue);
                              
                              // Normalizar y guardar el valor real
                              const normalizedPrice = normalizePrice(displayValue);
                              setFormData({...formData, price: normalizedPrice});
                            }}
                            onBlur={(e) => {
                              // Al perder el foco, formatear para display pero mantener el valor real
                              const normalizedPrice = normalizePrice(e.target.value);
                              setFormData({...formData, price: normalizedPrice});
                              setPriceDisplayValue(formatPriceForDisplay(normalizedPrice));
                            }}
                            onFocus={(e) => {
                              // Al hacer foco, mostrar el valor sin formato para fácil edición
                              setPriceDisplayValue(formData.price);
                            }}
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                            placeholder="0"
                            required
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="product-category" className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Categoría
                        </label>
                        <div className="relative">
                          <select
                            id="product-category"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="w-full pl-10 pr-8 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300 appearance-none cursor-pointer"
                            required
                          >
                            <option value="perros">🐕 Perros</option>
                            <option value="gatos">🐈 Gatos</option>
                            <option value="mascotasPequeñas">🐹 Mascotas Pequeñas</option>
                            <option value="accesorios">🎾 Accesorios y Juguetes</option>
                            <option value="farmacia">💊 Farmacia</option>
                          </select>
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </div>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="product-stock" className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Stock
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="product-stock"
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                          placeholder="0"
                          required
                          min="0"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección Código de Barras */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Código de Barras</h3>
                      <p className="text-sm text-gray-600">Identificación única del producto (opcional)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          id="product-barcode"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                          placeholder="Escanea o escribe el código"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProductScanner(true)}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Escanear
                      </button>
                    </div>
                    {formData.barcode && (
                      <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-green-800">Código actual: <span className="font-mono bg-green-100 px-2 py-1 rounded">{formData.barcode}</span></span>
                      </div>
                    )}
                  </div>
                </div>
                
                {isAccessoryCategory ? (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Especificaciones del Accesorio</h3>
                        <p className="text-sm text-gray-600">Describe materiales, medidas y detalles útiles para los clientes</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Tipo
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={accessorySpecs.type}
                            onChange={(e) => handleAccessorySpecChange('type', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                            placeholder="Ej: Correa retráctil, rascador, rompecabezas"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          Medidas / Dimensiones
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={accessorySpecs.dimensions}
                            onChange={(e) => handleAccessorySpecChange('dimensions', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                            placeholder="Ej: 45 cm x 3 cm · Talla M"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                          Color Principal
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={accessorySpecs.color}
                            onChange={(e) => handleAccessorySpecChange('color', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                            placeholder="Ej: Verde lima"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 4.142M8 4v5.172a2 2 0 00.586 1.414l5 5M8 4l1 1" />
                          </svg>
                          Material
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={accessorySpecs.material}
                            onChange={(e) => handleAccessorySpecChange('material', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                            placeholder="Ej: Nylon reforzado, silicona grado alimenticio"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 4.142M8 4v5.172a2 2 0 00.586 1.414l5 5M8 4l1 1" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Mascota Recomendada
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={accessorySpecs.recommendedPet}
                            onChange={(e) => handleAccessorySpecChange('recommendedPet', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300"
                            placeholder="Ej: Perros medianos · Gatos adultos"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.81l1.52-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Características Destacadas
                      </label>
                      <div className="relative">
                        <textarea
                          value={accessorySpecs.highlights}
                          onChange={(e) => handleAccessorySpecChange('highlights', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300 resize-none"
                          rows={4}
                          placeholder="Incluye detalles como usos, beneficios, accesorios incluidos o modos de juego."
                        />
                        <div className="absolute top-3 left-3 pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.81l1.52-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isPharmacyCategory ? (
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-5 border border-red-100">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 4.142M8 4v5.172a2 2 0 00.586 1.414l5 5M8 4l1 1" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Ficha del Medicamento</h3>
                        <p className="text-sm text-gray-600">Registra la información clave para orientar a los tutores sobre su uso responsable</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 4.142M8 4v5.172a2 2 0 00.586 1.414l5 5M8 4l1 1" />
                          </svg>
                          Tipo de Producto
                        </label>
                        <div className="relative">
                          <select
                            value={pharmacyInfo.productType}
                            onChange={(e) => handlePharmacyInfoChange('productType', e.target.value)}
                            className="w-full pl-10 pr-8 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300 appearance-none cursor-pointer"
                          >
                            <option value="">Selecciona una opción</option>
                            {PHARMACY_PRODUCT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                💊 {type}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 4.142M8 4v5.172a2 2 0 00.586 1.414l5 5M8 4l1 1" />
                            </svg>
                          </div>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Indicaciones
                        </label>
                        <div className="relative">
                          <textarea
                            value={pharmacyInfo.indications}
                            onChange={(e) => handlePharmacyInfoChange('indications', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300 resize-none"
                            rows={3}
                            placeholder="Describe para qué casos se recomienda (parasiticida, antiinflamatorio, antipulgas...)."
                          />
                          <div className="absolute top-3 left-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Modo de Uso / Administración
                        </label>
                        <div className="relative">
                          <textarea
                            value={pharmacyInfo.usage}
                            onChange={(e) => handlePharmacyInfoChange('usage', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300 resize-none"
                            rows={3}
                            placeholder="Incluye dosis orientativa, frecuencia, vía de administración o pasos relevantes."
                          />
                          <div className="absolute top-3 left-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Contraindicaciones y Advertencias
                        </label>
                        <div className="relative">
                          <textarea
                            value={pharmacyInfo.contraindications}
                            onChange={(e) => handlePharmacyInfoChange('contraindications', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-300 resize-none"
                            rows={3}
                            placeholder="Ej: No usar en hembras gestantes o lactantes, animales menores a 3 meses, etc."
                          />
                          <div className="absolute top-3 left-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
                      <svg className="w-5 h-5 text-amber-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-amber-800">
                        Recuerda siempre recomendar que los clientes consulten con su veterinario para indicaciones específicas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4 bg-gray-50">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">
                          Composición / ingredientes
                        </label>
                        {browserSupportsSpeechRecognition && (
                          <button
                            type="button"
                            onClick={() => toggleVoiceRecognition('composition')}
                            className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1 ${
                              isListening && voiceInputTargetRef.current === 'composition'
                                ? 'bg-red-100 text-red-600'
                                : 'text-indigo-600 hover:text-indigo-800'
                            }`}
                            aria-label="Dictar composición por voz"
                            title="Dictar composición por voz"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3m0 0H9m3 0h3M9 9V5a3 3 0 016 0v4a3 3 0 11-6 0z"
                              />
                            </svg>
                            <span>Dictar</span>
                          </button>
                        )}
                      </div>
                      <textarea
                        value={formData.details?.composition || ''}
                        onChange={(e) => handleDetailsChange('composition', e.target.value)}
                        className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Ej: Harina de carne y hueso, arroz, maíz..."
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        Escribe o pega la lista de ingredientes tal como aparece en el saco.
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">
                          Análisis garantizado
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={addAnalysisRow}
                            className="px-2 py-1 rounded-md border border-gray-300 text-[11px] sm:text-xs bg-white hover:bg-gray-100"
                          >
                            + Añadir fila
                          </button>
                        </div>
                      </div>
                      {analysisRows.length === 0 && (
                        <p className="text-[11px] text-gray-500 mb-2">
                          Agrega filas para registrar proteína, grasa, fibra, humedad, calorías, etc.
                        </p>
                      )}
                      <div className="space-y-2">
                        {analysisRows.map((row, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2">
                            <input
                              type="text"
                              value={row.label}
                              onChange={(e) => handleAnalysisRowChange(index, 'label', e.target.value)}
                              className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Nutriente"
                            />
                            <input
                              type="text"
                              value={row.value}
                              onChange={(e) => handleAnalysisRowChange(index, 'value', e.target.value)}
                              className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Valor"
                            />
                            <button
                              type="button"
                              onClick={() => removeAnalysisRow(index)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">
                          Guía de ración diaria
                        </label>
                      </div>

                      <div className="mt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-[11px] sm:text-xs text-gray-600">
                            Completa la tabla (ideal para matrices 2x2, 3x3, 4x4, etc.)
                          </p>
                          <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
                            <button
                              type="button"
                              onClick={addFeedingGuideColumn}
                              className="px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 font-medium text-gray-600"
                            >
                              + Columna
                            </button>
                            <button
                              type="button"
                              onClick={addFeedingGuideRow}
                              className="px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 font-medium text-gray-600"
                            >
                              + Fila
                            </button>
                            <button
                              type="button"
                              onClick={resetFeedingGuideTable}
                              className="px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                            >
                              Reiniciar
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                          <table className="min-w-full w-max text-[11px] sm:text-xs">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="w-[40px] px-1 py-2 border-b border-gray-200 text-center"></th>
                                {feedingGuideTable.columns.map((column, columnIndex) => (
                                  <th
                                    key={`fg-column-${columnIndex}`}
                                    className="px-3 py-2 text-left font-semibold border-b border-l border-gray-200 min-w-[120px]"
                                  >
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={column}
                                        onChange={(e) => handleFeedingGuideColumnChange(columnIndex, e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder={`Columna ${columnIndex + 1}`}
                                      />
                                      {feedingGuideTable.columns.length > MIN_FEEDING_GUIDE_COLUMNS && (
                                        <button
                                          type="button"
                                          onClick={() => removeFeedingGuideColumn(columnIndex)}
                                          className="text-gray-400 hover:text-red-500"
                                          title="Eliminar columna"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {feedingGuideTable.rows.map((row, rowIndex) => (
                                <tr key={`fg-row-${rowIndex}`}>
                                  <td className="w-[40px] px-1 py-2 align-top text-center">
                                    {feedingGuideTable.rows.length > MIN_FEEDING_GUIDE_ROWS && (
                                      <button
                                        type="button"
                                        onClick={() => removeFeedingGuideRow(rowIndex)}
                                        className="text-gray-400 hover:text-red-500"
                                        title="Eliminar fila"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </td>
                                  {feedingGuideTable.columns.map((_, columnIndex) => (
                                    <td key={`fg-cell-${rowIndex}-${columnIndex}`} className="px-2 py-2 align-top">
                                      <input
                                        type="text"
                                        value={row.values?.[columnIndex] ?? ''}
                                        onChange={(e) =>
                                          handleFeedingGuideCellChange(rowIndex, columnIndex, e.target.value)
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Ej: 150 g"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Usa filas para rangos de peso o edad y columnas para raciones (gramos, tazas, etc.). Se mostrará
                          tal cual en la tarjeta del producto.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-4 sm:mb-6">
                  <label htmlFor="product-image" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    URL de la Imagen (opcional)
                  </label>
                  <input
                    type="url"
                    id="product-image"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">Deja vacío para usar una imagen predeterminada</p>
                </div>
                
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProduct(false);
                      setFormData(createEmptyFormData('perros'));
                      setPriceDisplayValue(''); // Resetear el display del precio
                      setEditingProduct(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {editingProduct ? 'Guardar Cambios' : 'Agregar Producto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSearchScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Escanear código para buscar producto
                </h3>
                <button
                  onClick={() => setShowSearchScanner(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <BarcodeScanner
                onDetected={handleBarcodeSearchDetected}
                onClose={() => setShowSearchScanner(false)}
              />
            </div>
          </div>
        )}

        {showProductScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Escanear código para este producto
                </h3>
                <button
                  onClick={() => setShowProductScanner(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <BarcodeScanner
                onDetected={handleBarcodeProductDetected}
                onClose={() => setShowProductScanner(false)}
              />
            </div>
          </div>
        )}

        {showTextScanner && (
          <TextScannerModal
            onDetected={handleTextScannerDetected}
            onClose={closeTextScanner}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 mb-3">Comparte nuestro catálogo</p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
              {CATALOG_SOCIAL_LINKS.map((network) => (
                <a
                  key={network.id}
                  href={network.buildUrl(CATALOG_SHARE_MESSAGE, CATALOG_BASE_URL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${network.accent}`}
                >
                  <span className="inline-flex items-center justify-center rounded-full bg-white/80 p-1 text-gray-700">
                    {network.icon}
                  </span>
                  {network.label}
                </a>
              ))}
            </div>
            <p className="text-center text-xs sm:text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Rancho Mascotas Hualpén. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
      {/* Botones de desplazamiento - Ocultos cuando hay detalles visibles */}
      {!selectedProductDetails && !isCartOpen && !showLogin && !showAddProduct && (
        <div className="fixed right-3 sm:right-4 z-40 flex flex-col gap-2" style={{ bottom: '160px' }}>
          {showScrollUp && (
            <button
              type="button"
              onClick={handleScrollToTop}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
              aria-label="Ir al inicio del catálogo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          
          {showScrollDown && (
            <button
              type="button"
              onClick={handleScrollToFooter}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
              aria-label="Ir al final del catálogo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
      {/* Modal del Carrito */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      {/* Botón flotante de WhatsApp */}
      <WhatsAppButton />
      {/* Sistema de Backup - Solo visible para administrador */}
      <BackupManager />
      {/* Sistema de Exportación Excel - Solo visible para administrador */}
      <ExcelExporter />
      
      {/* Estilos para el slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #4f46e5;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #4f46e5;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-webkit-slider-thumb:hover {
          background: #4338ca;
          transform: scale(1.1);
        }
        
        .slider::-moz-range-thumb:hover {
          background: #4338ca;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}