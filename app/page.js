'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../src/contexts/AuthContext';
import { useProducts } from '../src/contexts/ProductContext';
import { useCart } from '../src/contexts/CartContext';
import { useTheme } from '../src/contexts/ThemeContext';
import CartIcon from '../src/components/CartIcon';
import CartModal from '../src/components/CartModal';
import FloatingCartButton from '../src/components/FloatingCartButton';
import BarcodeScanner from '../src/components/BarcodeScannerClient';
import TextScannerModal from '../src/components/TextScannerModal';

const createEmptyDetails = () => ({
  composition: '',
  analysis: [],
  feedingGuide: ''
});

export default function Home() {
  const { user, login, logout } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProducts();
  const { theme, toggleTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('perros');
  const [showLogin, setShowLogin] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [headerLogoFailed, setHeaderLogoFailed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'perros',
    image: '',
    stock: '',
    barcode: '',
    details: createEmptyDetails()
  });
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { addToCart } = useCart();
  const [alert, setAlert] = useState(null);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [lifeStage, setLifeStage] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isListening, setIsListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [showTextScanner, setShowTextScanner] = useState(false);
  const [textScannerTarget, setTextScannerTarget] = useState(null);
  const [siteVisits, setSiteVisits] = useState(0);
  const [cartMetrics, setCartMetrics] = useState([]);
  const searchInputRef = useRef(null);

  const normalizeDetails = (details) => {
    const base = createEmptyDetails();
    if (!details) return base;
    return {
      composition: details.composition || '',
      analysis: Array.isArray(details.analysis)
        ? details.analysis.map((row) => ({
            label: row?.label || '',
            value: row?.value || ''
          }))
        : [],
      feedingGuide: details.feedingGuide || ''
    };
  };

  const analysisRows = Array.isArray(formData.details?.analysis)
    ? formData.details.analysis
    : [];

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

  const handleDetailsChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [field]: value
      }
    }));
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
    } else if (textScannerTarget === 'feedingGuide') {
      handleDetailsChange('feedingGuide', text.trim());
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
        setSearchTerm(transcript);
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
    let isMounted = true;

    const registerVisit = async () => {
      try {
        const response = await fetch('/api/visits', { method: 'POST' });
        if (!response.ok) {
          throw new Error('Failed to increment visits');
        }
        const data = await response.json();
        if (isMounted) {
          setSiteVisits(Number(data.visits ?? 0));
        }
      } catch (error) {
        console.error('Error registrando la visita del sitio:', error);
        try {
          const response = await fetch('/api/visits');
          if (!response.ok) return;
          const data = await response.json();
          if (isMounted) {
            setSiteVisits(Number(data.visits ?? 0));
          }
        } catch (fallbackError) {
          console.error('Error obteniendo las visitas del sitio:', fallbackError);
        }
      }
    };

    registerVisit();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCartMetrics = async () => {
      try {
        const response = await fetch('/api/cart-metrics');
        if (!response.ok) {
          throw new Error('Failed to load cart metrics');
        }
        const data = await response.json();
        if (isMounted) {
          setCartMetrics(data.metrics || []);
        }
      } catch (error) {
        console.error('Error cargando las métricas del carrito:', error);
      }
    };

    loadCartMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearSearchTerm = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const toggleVoiceRecognition = () => {
    if (!browserSupportsSpeechRecognition) {
      showAlert('Tu navegador no soporta reconocimiento de voz', 'error');
      return;
    }

    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    } else {
      try {
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
    console.log('Productos a filtrar:', products[activeCategory]);
    let result = products[activeCategory] || [];
    
    // Filtrar por término de búsqueda (todas las palabras, en cualquier orden)
    if (searchTerm) {
      const terms = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
      result = result.filter(product => {
        const name = normalizeText(product.name);
        return terms.every(term => name.includes(term));
      });
    }

    // Filtrar por precio
    if (priceFilter === 'under10k') {
      result = result.filter(product => product.price < 10000);
    } else if (priceFilter === '10k-20k') {
      result = result.filter(product => product.price >= 10000 && product.price <= 20000);
    } else if (priceFilter === 'over20k') {
      result = result.filter(product => product.price > 20000);
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
  }, [products, activeCategory, searchTerm, priceFilter, lifeStage, sortBy]);

  const flatProducts = useMemo(() => {
    if (!products) return [];
    return Object.values(products)
      .filter(Array.isArray)
      .flat()
      .filter(Boolean);
  }, [products]);

  const cartMetricsMap = useMemo(() => {
    if (!cartMetrics?.length) return {};
    return cartMetrics.reduce((acc, metric) => {
      if (!metric?.productId) return acc;
      acc[metric.productId] = metric;
      return acc;
    }, {});
  }, [cartMetrics]);

  const catalogStats = useMemo(() => {
    if (!flatProducts.length && !cartMetrics.length) {
      return {
        totalProducts: 0,
        totalStock: 0,
        avgPrice: 0,
        lowStockCount: 0,
        mostOrdered: [],
        leastOrdered: [],
        categoryDistribution: []
      };
    }

    const totalProducts = flatProducts.length;
    const totalStock = flatProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const avgPrice = totalProducts
      ? Math.round(
          flatProducts.reduce((sum, product) => sum + Number(product.price || 0), 0) / totalProducts
        )
      : 0;
    const lowStockCount = flatProducts.filter((product) => Number(product.stock || 0) <= 5).length;

    const withOrdersMetric = flatProducts.map((product) => {
      const metric = cartMetricsMap[product.id];
      return {
        ...product,
        ordersMetric: Number(metric?.cartAdds ?? 0)
      };
    });

    const existingProductIds = new Set(flatProducts.map((product) => product.id));
    const metricsOnlyProducts = cartMetrics
      .filter((metric) => metric.productId && !existingProductIds.has(metric.productId))
      .map((metric) => ({
        id: metric.productId,
        name: metric.productName || 'Producto sin nombre',
        category: metric.category || 'otros',
        price: 0,
        stock: 0,
        ordersMetric: Number(metric.cartAdds || 0)
      }));

    const rankingPool = [...withOrdersMetric, ...metricsOnlyProducts];

    const mostOrdered = rankingPool
      .filter((product) => (product.ordersMetric || 0) > 0)
      .sort((a, b) => (b.ordersMetric || 0) - (a.ordersMetric || 0))
      .slice(0, 5);
    const leastOrdered = rankingPool
      .sort((a, b) => (a.ordersMetric || 0) - (b.ordersMetric || 0))
      .slice(0, 5);

    const categoryMap = withOrdersMetric.reduce((acc, product) => {
      const category = typeof product.category === 'string' && product.category.trim()
        ? product.category
        : 'otros';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
      percentage: totalProducts ? Math.round((count / totalProducts) * 100) : 0
    }));

    return {
      totalProducts,
      totalStock,
      avgPrice,
      lowStockCount,
      mostOrdered,
      leastOrdered,
      categoryDistribution
    };
  }, [flatProducts, cartMetrics, cartMetricsMap]);

  const formatCategoryLabel = (category) => {
    if (category === 'mascotasPequeñas') return 'Mascotas pequeñas';
    if (category === 'otros') return 'Otros';
    if (!category) return 'Sin categoría';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

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

  const recordCartMetric = useCallback(
    async (product) => {
      if (!product?.id) return;
      try {
        const response = await fetch('/api/cart-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: product.id,
            productName: product.name,
            category: product.category || activeCategory || 'otros'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to record cart metric');
        }

        const data = await response.json();
        setCartMetrics((prev) => {
          const others = prev.filter((metric) => metric.productId !== data.productId);
          return [
            ...others,
            {
              productId: data.productId,
              productName: product.name || data.productName || 'Producto sin nombre',
              category: product.category || data.category || activeCategory || 'otros',
              cartAdds: Number(data.cartAdds ?? 0)
            }
          ];
        });
      } catch (error) {
        console.error('Error registrando métrica de carrito:', error);
      }
    },
    [activeCategory]
  );

  const handleAddToCart = (product) => {
    // Verificar si hay stock disponible
    const currentStock = product.stock || 0;
    if (currentStock <= 0) {
      showAlert('Este producto está agotado', 'error');
      return;
    }
    addToCart(product);
    showAlert(`"${product.name}" agregado al carrito`, 'success');
    recordCartMetric(product);
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 3000);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const newProduct = {
      name: formData.name,
      price: Number(formData.price),
      image: formData.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(formData.name)}`,
      stock: Number(formData.stock) || 0,
      barcode: formData.barcode || '',
      details: formData.details
    };
    
    if (editingProduct) {
      updateProduct(editingProduct.category, editingProduct.id, newProduct);
      showAlert(`"${newProduct.name}" actualizado exitosamente`, 'success');
    } else {
      addProduct(formData.category, newProduct);
      showAlert(`"${newProduct.name}" agregado exitosamente`, 'success');
    }
    
    setFormData({
      name: '',
      price: '',
      category: 'perros',
      image: '',
      stock: '',
      barcode: '',
      details: createEmptyDetails()
    });
    setEditingProduct(null);
    setShowAddProduct(false);
  };

  const handleEditProduct = (product, category) => {
    setFormData({
      name: product.name,
      price: product.price,
      category: category,
      image: product.image,
      stock: product.stock || '',
      barcode: product.barcode || '',
      details: normalizeDetails(product.details)
    });
    setEditingProduct({ id: product.id, category });
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
      setPriceFilter('all');
      setLifeStage('all');
      setSortBy('name');
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
    <div
      className={`min-h-screen flex flex-col ${
        theme === 'dark'
          ? 'bg-gray-950 text-gray-100'
          : 'bg-gray-50 text-gray-900'
      }`}
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
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3 ml-2 sm:ml-0">
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
            <h1 className="hidden sm:block text-lg sm:text-2xl font-bold text-indigo-600">Rancho Mascotas Hualpén</h1>
          </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                type="button"
                onClick={toggleTheme}
                className="hidden sm:inline-flex items-center px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {theme === 'dark' ? (
                  <>
                    {/* Sol para modo claro */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-yellow-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 3.5a1 1 0 011-1h0a1 1 0 110 2h0a1 1 0 01-1-1zM10 15.5a1 1 0 011-1h0a1 1 0 110 2h0a1 1 0 01-1-1zM4.22 5.64a1 1 0 011.42-1.42h0a1 1 0 11-1.42 1.42zM14.36 15.78a1 1 0 011.42-1.42h0a1 1 0 11-1.42 1.42zM3.5 10a1 1 0 011-1h0a1 1 0 110 2h0a1 1 0 01-1-1zM15.5 10a1 1 0 011-1h0a1 1 0 110 2h0a1 1 0 01-1-1zM4.22 14.36a1 1 0 010-1.42h0a1 1 0 111.42 1.42h0a1 1 0 01-1.42 0zM14.36 4.22a1 1 0 010-1.42h0a1 1 0 111.42 1.42h0a1 1 0 01-1.42 0z" />
                      <path d="M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
                    </svg>
                    <span>Modo claro</span>
                  </>
                ) : theme === 'light' ? (
                  <>
                    {/* Luna para modo oscuro */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-indigo-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M17.293 13.293A8 8 0 016.707 2.707 6 6 0 1017.293 13.293z" />
                    </svg>
                    <span>Modo oscuro</span>
                  </>
                ) : (
                  <span>Tema</span>
                )}
              </button>
              <Link 
                href="/encuentrenos"
                className="px-2 py-1 text-xs sm:px-3 sm:py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Encuéntrenos
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

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-indigo-700 rounded-lg shadow-xl overflow-hidden mb-6 sm:mb-8 lg:mb-12">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white lg:text-4xl">
                  <span className="block">Todo para tus mascotas</span>
                  <span className="block text-indigo-200">En un solo lugar</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm sm:text-lg text-indigo-100">
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
          <div className="flex flex-wrap gap-2 sm:flex sm:space-x-4 sm:gap-0 mb-4 overflow-x-auto pb-2">
            {Object.keys(products).filter(category => 
              ['perros', 'gatos', 'mascotasPequeñas', 'accesorios', 'farmacia'].includes(category)
            ).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category === 'perros' && '🐶 Perros'}
                {category === 'gatos' && '🐱 Gatos'}
                {category === 'mascotasPequeñas' && '🐹 Mascotas Pequeñas'}
                {category === 'accesorios' && '🎾 Accesorios y Juguetes'}
                {category === 'farmacia' && '💊 Farmacia'}
              </button>
            ))}
          </div>
          
          {/* Barra de búsqueda y filtros */}
          <div className="mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100">
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
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
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
                    onClick={toggleVoiceRecognition}
                    className={`absolute right-2 p-1 rounded-full ${isListening ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:text-indigo-600'}`}
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
                  {isListening && (
                    <span className="absolute right-20 text-sm text-red-600 animate-pulse">
                      Escuchando...
                    </span>
                  )}
                </div>
              </div>
              
              {/* Filtro por precio */}
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="block w-full pl-3 pr-8 sm:pr-10 py-2 text-xs sm:text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                <option value="all">Todos los precios</option>
                <option value="under10k">Menos de $10.000</option>
                <option value="10k-20k">$10.000 - $20.000</option>
                <option value="over20k">Más de $20.000</option>
              </select>
              
              {/* Filtro por etapa de vida */}
              <select
                value={lifeStage}
                onChange={(e) => {
                  console.log('Cambiando etapa de vida a:', e.target.value);
                  setLifeStage(e.target.value);
                }}
                className="block w-full pl-3 pr-8 sm:pr-10 py-2 text-xs sm:text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                <option value="all">Todas las etapas</option>
                <option value="cachorro">Cachorro</option>
                <option value="adulto">Adulto</option>
                <option value="senior">Senior</option>
              </select>

              {/* Ordenar por */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full pl-3 pr-8 sm:pr-10 py-2 text-xs sm:text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                <option value="name">Ordenar por nombre</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>
            
            {/* Contador de resultados */}
            <div className="mt-3 text-xs sm:text-sm text-gray-500">
              Mostrando {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {searchTerm && ` para "${searchTerm}"`}
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
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 sm:dark:text-white">Panel de estadísticas</h3>
                  <p className="text-sm text-gray-500 sm:dark:text-gray-400">Solo visible para administradores</p>
                </div>
                <div className="text-sm sm:text-base font-medium text-indigo-600 sm:dark:text-indigo-300">
                  Visitas al sitio: <span className="text-gray-900 sm:dark:text-white">{siteVisits.toLocaleString('es-CL')}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Productos totales</p>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">{catalogStats.totalProducts}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Stock acumulado</p>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">{catalogStats.totalStock.toLocaleString('es-CL')}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Precio promedio</p>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">${catalogStats.avgPrice.toLocaleString('es-CL')}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Bajo stock (≤5)</p>
                  <p className="text-2xl font-bold text-gray-900 sm:dark:text-white">{catalogStats.lowStockCount}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 sm:dark:border-gray-800 bg-white sm:dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900 sm:dark:text-white">Más solicitados</h4>
                    <span className="text-xs text-gray-500">Top 5</span>
                  </div>
                  {catalogStats.mostOrdered.length ? (
                    <ul className="space-y-2">
                      {catalogStats.mostOrdered.map((product) => (
                        <li key={`most-${product.id}`} className="flex items-center justify-between text-sm">
                          <span className="truncate text-gray-800 sm:dark:text-gray-200">{product.name || 'Sin nombre'}</span>
                          <span className="ml-3 inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-indigo-50 sm:dark:bg-indigo-900/40 text-indigo-600 sm:dark:text-indigo-200">
                            {(product.ordersMetric || 0).toLocaleString('es-CL')} pedidos
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="relative min-h-screen bg-gray-50">
                      <p className="text-sm text-gray-500">Aún no hay datos suficientes.</p>
                    </div>
                  )}
                </div>

              </div>

              <div className="mt-6">
                <h4 className="text-base font-semibold text-gray-900 sm:dark:text-white mb-3">Distribución por categoría</h4>
                {catalogStats.categoryDistribution.length ? (
                  <div className="flex items-end space-x-3 h-40">
                    {catalogStats.categoryDistribution
                      .filter(({ category }) => category !== 'otros')
                      .map(({ category, percentage, count }) => (
                      <div key={category} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-500 text-white text-xs font-semibold flex items-end justify-center"
                          style={{ height: `${Math.max(percentage, 5)}%` }}
                          title={`${count} productos`}
                        >
                          <span className="pb-1">{percentage}%</span>
                        </div>
                        <p className="category-label mt-2 text-xs text-center text-gray-600 sm:dark:text-gray-300">
                          {category === 'mascotasPequeñas' ? 'Mascotas pequeñas' : category}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Agrega productos para ver la distribución.</p>
                )}
              </div>
            </section>
          )}

          {loading ? (
            <div className="col-span-full py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Cargando productos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-8 sm:py-12 text-center">
                <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">Intenta con otros términos de búsqueda o filtros.</p>
                {(searchTerm || priceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPriceFilter('all');
                      setLifeStage('all');
                    }}
                    className="mt-4 inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => {
                const productDetails = normalizeDetails(product.details);
                const hasComposition = Boolean(productDetails.composition?.trim());
                const hasAnalysis = Array.isArray(productDetails.analysis) && productDetails.analysis.length > 0;
                const hasFeedingGuide = Boolean(productDetails.feedingGuide?.trim());
                const hasDetails = hasComposition || hasAnalysis || hasFeedingGuide;
                const highlightedAnalysis = productDetails.analysis || [];

                return (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="w-full h-40 sm:h-48 bg-white rounded-t-lg overflow-hidden border-b border-gray-200">
                    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                      {product.image ? (
                        <div className="relative w-full h-full">
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
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <span className="text-xs sm:text-sm text-gray-400">Sin imagen</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-indigo-600 font-bold text-sm sm:text-base">${product.price.toLocaleString('es-CL')}</p>
                    
                    {/* Estado del stock */}
                    <div className="mt-2">
                      {product.stock > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Stock disponible{user && ` (${product.stock})`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Agotado temporalmente
                        </span>
                      )}
                    </div>
                    {hasDetails && (
                      <div className="mt-4 space-y-3 text-xs">
                        {hasAnalysis && (
                          <div>
                            <p className="text-gray-500 uppercase tracking-wide text-[11px] font-semibold mb-1">
                              Análisis garantizado
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {highlightedAnalysis.map((row, idx) => (
                                <span
                                  key={`${product.id}-analysis-${idx}`}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium"
                                >
                                  {row.label && <span className="mr-1">{row.label}:</span>}
                                  <span>{row.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {hasComposition && (
                          <div>
                            <p className="text-gray-500 uppercase tracking-wide text-[11px] font-semibold mb-1">
                              Composición
                            </p>
                            <p className="text-gray-600 text-[11px] leading-relaxed line-clamp-3">
                              {productDetails.composition}
                            </p>
                          </div>
                        )}
                        {hasFeedingGuide && (
                          <div>
                            <p className="text-gray-500 uppercase tracking-wide text-[11px] font-semibold mb-1">
                              Guía de ración diaria
                            </p>
                            <p className="text-gray-600 text-[11px] leading-relaxed line-clamp-3 whitespace-pre-line">
                              {productDetails.feedingGuide}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 sm:mt-4 flex justify-between items-center">
                      <button 
                        onClick={() => handleAddToCart({ ...product, category: activeCategory })}
                        disabled={product.stock <= 0}
                        className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm transition-colors duration-200 ${
                          product.stock > 0 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
                      </button>
                      {user && (
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
                      )}
                    </div>
                  </div>
                </div>
              )})
            )}
          </div>
          )}
        </div>

      {user && (
          <div className="fixed bottom-24 sm:bottom-28 right-4 sm:right-8 z-30">
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  price: '',
                  category: 'perros',
                  image: '',
                  stock: '',
                  barcode: '',
                  details: createEmptyDetails()
                });
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
              
              <form onSubmit={handleAddProduct}>
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="product-name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    id="product-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    required
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="product-price" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Precio
                  </label>
                  <input
                    type="number"
                    id="product-price"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="product-category" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="product-category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    required
                  >
                    <option value="perros">Perros</option>
                    <option value="gatos">Gatos</option>
                    <option value="mascotasPequeñas">Mascotas Pequeñas</option>
                    <option value="accesorios">Accesorios y Juguetes</option>
                    <option value="farmacia">Farmacia</option>
                  </select>
                </div>
                
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="product-stock" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    id="product-stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="mb-3 sm:mb-4">
                  <label htmlFor="product-barcode" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Código de barras (opcional)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="product-barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                      placeholder="Escanea o escribe el código"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProductScanner(true)}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Escanear
                    </button>
                  </div>
                  {formData.barcode && (
                    <p className="mt-1 text-xs text-gray-500">Código actual: {formData.barcode}</p>
                  )}
                </div>
                
                <div className="mt-5 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4 bg-gray-50">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">
                        Composición / ingredientes
                      </label>
                      <button
                        type="button"
                        onClick={() => openTextScanner('composition')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Escanear texto
                      </button>
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
                        <button
                          type="button"
                          onClick={() => openTextScanner('analysis')}
                          className="px-2 py-1 rounded-md border border-indigo-200 text-[11px] sm:text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                        >
                          Escanear tabla
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
                      <button
                        type="button"
                        onClick={() => openTextScanner('feedingGuide')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Escanear guía
                      </button>
                    </div>
                    <textarea
                      value={formData.details?.feedingGuide || ''}
                      onChange={(e) => handleDetailsChange('feedingGuide', e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ej: 5-10kg → 150-210 g/día..."
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Puedes pegar texto o detallar una tabla de raciones recomendadas.
                    </p>
                  </div>
                </div>
                
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
                
                <div className="flex justify-end space-x-2 sm:space-x-3">
                  <button
                    type="button"
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
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
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
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Rancho Mascotas Hualpén. Todos los derechos reservados.
          </p>
        </div>
      </footer>
      
      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
      {/* Modal del Carrito */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}