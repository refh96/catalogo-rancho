'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useOptimizedProducts } from '@/contexts/OptimizedProductContext';
import { debounce, throttle } from '@/utils/dataStructures';

const OptimizedSearchBar = ({ 
  placeholder = "Buscar productos...", 
  onProductSelect,
  className = "",
  showResults = true,
  maxResults = 8 
}) => {
  const { searchProducts, searchResults, getProductById } = useOptimizedProducts();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounce para búsqueda optimizada
  const debouncedSearch = useMemo(
    () => debounce((searchQuery) => {
      setLoading(true);
      searchProducts(searchQuery);
      
      // Simular loading para mejor UX
      setTimeout(() => setLoading(false), 150);
    }, 300),
    [searchProducts]
  );

  // Throttle para scroll de resultados
  const throttledScroll = useMemo(
    () => throttle(() => {
      // Lógica para lazy loading de resultados si es necesario
    }, 100),
    []
  );

  // Manejar cambio de query
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    if (value.trim()) {
      debouncedSearch(value);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      searchProducts(''); // Limpiar resultados
    }
  }, [debouncedSearch, searchProducts]);

  // Manejar selección con teclado
  const handleKeyDown = useCallback((e) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const selectedProduct = searchResults[selectedIndex];
          handleProductSelect(selectedProduct);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, searchResults, selectedIndex]);

  // Manejar selección de producto
  const handleProductSelect = useCallback((product) => {
    setQuery(product.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onProductSelect) {
      onProductSelect(product);
    }
    
    inputRef.current?.blur();
  }, [onProductSelect]);

  // Limpiar búsqueda
  const clearSearch = useCallback(() => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    searchProducts('');
    inputRef.current?.focus();
  }, [searchProducts]);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target) &&
          resultsRef.current && !resultsRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll al resultado seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ 
          block: 'nearest', 
          behavior: 'smooth' 
        });
      }
    }
  }, [selectedIndex]);

  // Limitar resultados para mejor rendimiento
  const limitedResults = useMemo(() => 
    searchResults.slice(0, maxResults),
    [searchResults, maxResults]
  );

  // Formatear precio
  const formatPrice = useCallback((price) => {
    return `$${parseInt(price || 0).toLocaleString('es-CL')}`;
  }, []);

  // Obtener imagen con fallback
  const getProductImage = useCallback((product) => {
    return product.image || '/placeholder-product.png';
  }, []);

  return (
    <div className={`relative w-full max-w-2xl ${className}`}>
      {/* Input de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon 
            className={`h-5 w-5 transition-colors duration-200 ${
              loading ? 'text-indigo-500 animate-pulse' : 'text-gray-400'
            }`} 
          />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
          </button>
        )}
      </div>

      {/* Resultados de búsqueda optimizados */}
      {showResults && isOpen && (
        <div 
          ref={resultsRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto"
          onScroll={throttledScroll}
        >
          {loading ? (
            <div className="p-4 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-500">Buscando...</span>
              </div>
            </div>
          ) : limitedResults.length > 0 ? (
            <>
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500">
                  {limitedResults.length} resultado{limitedResults.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="py-1">
                {limitedResults.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-150 ${
                      index === selectedIndex ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    {/* Imagen del producto */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Información del producto */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                          {product.name}
                        </h4>
                        <span className="text-sm font-bold text-indigo-600">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          {product.category}
                        </span>
                        
                        {product.stock <= 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Sin stock
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : query.trim() ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No se encontraron productos</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OptimizedSearchBar;
