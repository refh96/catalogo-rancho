'use client';

import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../contexts/CartContext';
import { useEffect, useState } from 'react';

export default function FloatingCartButton({ onClick }) {
  const { totalItems, cart } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

  // Efecto para animar el carrito constantemente cuando hay productos
  useEffect(() => {
    let interval;
    
    if (totalItems > 0) {
      // Función para alternar la animación
      const startAnimation = () => {
        // Tiempo entre animaciones (5 segundos)
        const intervalTime = 5000;
        // Duración de cada animación (1 segundo)
        const animationDuration = 1000;
        
        // Iniciar la primera animación después de 2 segundos
        const initialTimeout = setTimeout(() => {
          setIsAnimating(true);
          
          // Configurar el intervalo para animaciones posteriores
          interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), animationDuration);
          }, intervalTime + animationDuration);
          
          // Apagar la animación inicial después de su duración
          setTimeout(() => setIsAnimating(false), animationDuration);
        }, 2000);
        
        return () => {
          clearTimeout(initialTimeout);
          clearInterval(interval);
        };
      };
      
      startAnimation();
    }
    
    return () => {
      if (interval) clearInterval(interval);
      setIsAnimating(false);
    };
  }, [totalItems]);

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 shadow-lg transition-all hover:scale-110 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${isAnimating ? 'animate-wiggle' : ''}`}
      aria-label="Ver carrito"
    >
      <div className="relative">
        <ShoppingCartIcon className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-gray-900">
            {totalItems}
          </span>
        )}
      </div>
      
      {/* Estilos para la animación */}
      <style jsx global>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0) rotate(-5deg) scale(1.1); }
          25% { transform: translateX(-3px) rotate(5deg) scale(1.1); }
          50% { transform: translateX(3px) rotate(-8deg) scale(1.1); }
          75% { transform: translateX(-3px) rotate(8deg) scale(1.1); }
        }
        .animate-wiggle {
          animation: wiggle 1s ease-in-out;
          transform-origin: center bottom;
        }
      `}</style>
    </button>
  );
}