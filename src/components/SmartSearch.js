'use client';
import { useState, useEffect, useMemo } from 'react';

export default function SmartSearch({ products, onProductSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Búsqueda inteligente con sugerencias
  const searchProducts = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return products.filter(product => {
      const searchText = `${product.name} ${product.category} ${product.description || ''}`.toLowerCase();
      
      // Búsqueda por términos múltiples
      return searchTerms.every(term => 
        searchText.includes(term)
      );
    }).slice(0, 6); // Limitar a 6 resultados
  }, [products, query]);

  // Generar sugerencias populares
  const popularSearches = [
    'alimento perros',
    'arena gatos',
    'juguete mascotas',
    'transporte mascotas',
    'vitaminas mascotas'
  ];

  useEffect(() => {
    if (query.length > 0) {
      setIsSearching(true);
      
      // Simular búsqueda con delay para mejor UX
      const timer = setTimeout(() => {
        setSuggestions(searchProducts);
        setIsSearching(false);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  }, [query, searchProducts]);

  const handleSuggestionClick = (product) => {
    setQuery(product.name);
    setSuggestions([]);
    onProductSelect(product);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Input de búsqueda mejorado */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos para tu mascota..."
          className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 focus-visible"
          autoComplete="off"
        />

        {/* Indicador de búsqueda */}
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent border-r-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Botón de limpiar */}
        {query && !isSearching && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sugerencias de búsqueda */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {suggestions.length} productos encontrados
            </div>
            
            {suggestions.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSuggestionClick(product)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus-visible"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">🐾</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                      <span className="text-lg font-bold text-indigo-600">
                        ${product.price?.toLocaleString('es-CL')}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.category === 'perros' ? 'bg-blue-100 text-blue-700' :
                        product.category === 'gatos' ? 'bg-pink-100 text-pink-700' :
                        product.category === 'mascotasPequeñas' ? 'bg-green-100 text-green-700' :
                        product.category === 'accesorios' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {product.category === 'mascotasPequeñas' ? 'Mascotas Pequeñas' : 
                         product.category === 'perros' ? 'Perros' : 
                         product.category === 'gatos' ? 'Gatos' : 
                         product.category === 'accesorios' ? 'Accesorios' : 'Farmacia'}
                      </span>
                      
                      {product.stock > 0 && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Búsquedas populares cuando no hay resultados */}
      {query && suggestions.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-6 z-50">
          <div className="text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">No encontramos resultados para "{query}"</p>
            </div>
            
            <div className="text-left">
              <h5 className="font-semibold text-gray-900 mb-3">Búsquedas populares:</h5>
              <div className="space-y-2">
                {popularSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full text-left p-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    🔍 {search}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
