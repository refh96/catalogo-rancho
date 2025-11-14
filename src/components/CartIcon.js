// src/components/CartIcon.js
'use client';
import { useCart } from '../contexts/CartContext';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function CartIcon() {
  const { totalItems } = useCart();
  
  return (
    <div className="relative">
      <ShoppingCartIcon className="h-6 w-6 text-gray-700" />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </div>
  );
}