'use client';
import { useState } from 'react';

export default function ActionButtons({ product, onAddToCart, onShare, onNavigate }) {
  const [isAdded, setIsAdded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleAddToCart = async () => {
    setIsAdded(true);
    await onAddToCart(product);
    
    // Resetear después de 2 segundos
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleShare = async () => {
    setIsSharing(true);
    await onShare(product);
    setTimeout(() => setIsSharing(false), 1000);
  };

  const handleQuickView = () => {
    onNavigate(product);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-6">
      {/* Botón Principal - Agregar al Carrito */}
      <button
        onClick={handleAddToCart}
        disabled={isAdded}
        className={`
          flex-1 mobile-button
          px-6 py-4 rounded-2xl font-bold text-white text-base
          transform transition-all duration-300
          focus-visible
          relative overflow-hidden
          ${isAdded 
            ? 'bg-green-500 cursor-not-allowed' 
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:scale-105 hover:shadow-xl active:scale-95'
          }
        `}
      >
        {/* Estados del botón */}
        <div className="flex items-center justify-center space-x-2">
          {isAdded ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Agregado</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7M9 21v-7a2 2 0 002-2h.01M12 21v-7a2 2 0 002-2h.01" />
              </svg>
              <span>Agregar al Carrito</span>
            </>
          )}
        </div>

        {/* Efecto de onda */}
        {!isAdded && (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 animate-pulse" />
        )}
      </button>

      {/* Botón Secundario - Vista Rápida */}
      <button
        onClick={handleQuickView}
        className="mobile-button px-6 py-4 rounded-2xl font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transform transition-all duration-300 hover:scale-105 focus-visible"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Vista Rápida</span>
        </div>
      </button>

      {/* Botón Terciario - Compartir */}
      <button
        onClick={handleShare}
        disabled={isSharing}
        className="mobile-button px-6 py-4 rounded-2xl font-semibold text-indigo-600 bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100 transform transition-all duration-300 hover:scale-105 focus-visible"
      >
        <div className="flex items-center space-x-2">
          {isSharing ? (
            <>
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent border-r-transparent rounded-full animate-spin" />
              <span>Compartiendo...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.5c0-.438-.114-.938-.114-1.342 0-.5.5.842-.842 1.342 0 .5.342.842 1.342 0zm5.632 0c.5 0 .842.342 1.342.342.5 0 .842-.342 1.342-.342zm5.632 0c.5 0 .842.342 1.342.342.5 0 .842-.342 1.342-.342zm-2.421 5.842c-.5 0-.842.342-1.342-.342-.5 0-.842.342-1.342.342m0 3.157c0 .5.342.842.842 1.342.842.5 0 .842-.342 1.342-.342zm-2.421 5.842c-.5 0-.842.342-1.342-.342-.5 0-.842.342-1.342.342" />
              </svg>
              <span>Compartir</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}
