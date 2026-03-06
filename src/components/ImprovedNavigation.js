'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ImprovedNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const categories = [
    { 
      id: 'perros', 
      label: 'Perros', 
      emoji: '🐕',
      color: 'from-blue-500 to-cyan-600',
      description: 'Alimentos, juguetes y accesorios'
    },
    { 
      id: 'gatos', 
      label: 'Gatos', 
      emoji: '🐱',
      color: 'from-pink-500 to-rose-600',
      description: 'Arena, alimentos y cuidado'
    },
    { 
      id: 'mascotasPequeñas', 
      label: 'Mascotas Pequeñas', 
      emoji: '🐹',
      color: 'from-green-500 to-emerald-600',
      description: 'Hamsters, conejos y más'
    },
    { 
      id: 'accesorios', 
      label: 'Accesorios', 
      emoji: '🦴',
      color: 'from-amber-500 to-orange-600',
      description: 'Collares, camas y transporte'
    },
    { 
      id: 'farmacia', 
      label: 'Farmacia', 
      emoji: '💊',
      color: 'from-purple-500 to-indigo-600',
      description: 'Salud y bienestar'
    }
  ];

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Menú Desktop - Siempre visible */}
      <nav className="hidden lg:flex bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl p-6 border border-gray-100 sticky top-4 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-5 gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`#${category.id}`}
                className={`group relative p-6 rounded-xl bg-gradient-to-br ${category.color} text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus-visible`}
                onMouseEnter={() => setActiveCategory(category.id)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3 transform transition-transform group-hover:scale-110">
                    {category.emoji}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{category.label}</h3>
                  <p className="text-sm opacity-90 text-center leading-relaxed">
                    {category.description}
                  </p>
                </div>
                
                {/* Indicador activo */}
                {activeCategory === category.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-8-8a1 1 0 011.414-1.414l8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Menú Móvil - Hamburguesa mejorada */}
      <div className="lg:hidden fixed top-4 left-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl p-4 border border-gray-100 flex items-center justify-between mobile-button"
        >
          <span className="font-bold text-gray-900">Categorías</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Explorar</span>
            <svg 
              className={`w-6 h-6 text-gray-700 transform transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Panel desplegable */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/98 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`#${category.id}`}
                  className={`block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors mobile-button ${category.color} text-white`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{category.emoji}</div>
                    <div>
                      <h3 className="font-bold">{category.label}</h3>
                      <p className="text-sm opacity-90">{category.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overlay para móvil */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
