// src/components/CartIcon.js
'use client';
import { useCart } from '../contexts/CartContext';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function CartIcon() {
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
  }, [totalItems]); // Se activa cuando cambia el total de items
  
  return (
    <div className={`relative ${isAnimating ? 'animate-wiggle' : ''}`}>
      <ShoppingCartIcon className="h-6 w-6 text-gray-700 cart-icon" />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
      
      {/* Estilos para la animación */}
      <style jsx global>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          25% { transform: rotate(5deg); }
          50% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        .animate-wiggle {
          animation: wiggle 1s ease-in-out;
          transform-origin: center bottom;
        }
      `}</style>
    </div>
  );
}