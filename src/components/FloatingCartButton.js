'use client';

import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../contexts/CartContext';

export default function FloatingCartButton({ onClick }) {
  const { totalItems } = useCart();

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/40 transition-all duration-200 hover:bg-indigo-500 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400"
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
      <span className="hidden sm:inline">Carrito</span>
    </button>
  );
}
