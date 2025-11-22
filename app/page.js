'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../src/contexts/AuthContext';
import { useProducts } from '../src/contexts/ProductContext';
import { useCart } from '../src/contexts/CartContext';
import CartIcon from '../src/components/CartIcon';
import CartModal from '../src/components/CartModal';
import BarcodeScanner from '../src/components/BarcodeScannerClient';

export default function Home() {
  const { user, login, logout } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useProducts();
  const [activeCategory, setActiveCategory] = useState('perros');
  const [showLogin, setShowLogin] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'perros',
    image: '',
    stock: '',
    barcode: ''
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
  }, [products, activeCategory, searchTerm, priceFilter, sortBy, lifeStage]); // Añadido lifeStage a las dependencias


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
    // Verificar si hay stock disponible
    const currentStock = product.stock || 0;
    if (currentStock <= 0) {
      showAlert('Este producto está agotado', 'error');
      return;
    }
    addToCart(product);
    showAlert(`"${product.name}" agregado al carrito`, 'success');
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
      barcode: formData.barcode || ''
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
      barcode: ''
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
      barcode: product.barcode || ''
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
              <img 
                src="https://i.ibb.co/twMHRJmQ/503853895-17910857019133345-7677598013054732096-n.jpg"
                alt="Logo Rancho de Mascotas Hualpén"
                className="w-20 h-20 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="w-20 h-20 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center" style={{display: 'none'}}>
                <span className="text-white text-sm font-bold">RM</span>
              </div>
              <h1 className="hidden sm:block text-lg sm:text-2xl font-bold text-indigo-600">Rancho Mascotas Hualpén</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
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
                    <img
                      className="w-full h-48 sm:h-64 object-cover"
                      src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
                      alt="Mascotas felices"
                    />
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
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
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
                    <span className="absolute right-10 text-sm text-red-600 animate-pulse">
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
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="w-full h-40 sm:h-48 bg-white rounded-t-lg overflow-hidden border-b border-gray-200">
                    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-auto h-auto max-h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150?text=Sin+imagen';
                          }}
                        />
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
              ))
            )}
          </div>
          )}
        </div>

      {user && (
          <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8">
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  price: '',
                  category: 'perros',
                  image: '',
                  stock: '',
                  barcode: ''
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Rancho Mascotas Hualpén. Todos los derechos reservados.
          </p>
        </div>
      </footer>
      
      {/* Modal del Carrito */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}