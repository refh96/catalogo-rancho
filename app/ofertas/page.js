'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProducts } from '../../src/contexts/ProductContext';
import { useCart } from '../../src/contexts/CartContext';
import CartIcon from '../../src/components/CartIcon';
import CartModal from '../../src/components/CartModal';
import WhatsAppButton from '../../src/components/WhatsAppButton';
import FloatingCartButton from '../../src/components/FloatingCartButton';
import FeaturedProductsCarousel from '../../src/components/FeaturedProductsCarousel';
import { useVercelAnalytics } from '../../src/hooks/useVercelAnalytics';

export default function OfertasPage() {
  useVercelAnalytics();
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [headerLogoFailed, setHeaderLogoFailed] = useState(false);

  const navigateToProduct = (product) => {
    if (product && product.id) {
      window.location.href = `/producto/${product.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con mismo diseño que homepage */}
      <header className="bg-white/30 backdrop-blur-sm shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <a href="/" className="flex items-center space-x-2 cursor-pointer">
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
              <h1 className="hidden sm:block text-lg sm:text-2xl font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Rancho Mascotas Hualpén
              </h1>
            </a>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href="/ofertas"
                className="px-2 py-1 text-xs sm:px-3 sm:py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors border-b-2 border-indigo-600"
              >
                Ofertas
              </Link>
              <Link 
                href="/encuentrenos"
                className="px-2 py-1 text-xs sm:px-3 sm:py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Quienes Somos
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative py-4 sm:py-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-cyan-50" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500 mb-2">
              Ofertas Especiales
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Descubre los mejores productos destacados con precios especiales para tus mascotas
            </p>
          </div>
        </div>
      </div>

      {/* Featured Products Carousel */}
      <FeaturedProductsCarousel onProductSelect={navigateToProduct} />

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            © 2024 Rancho Mascotas Hualpén. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        clearCart={clearCart}
      />

      {/* WhatsApp Button */}
      <WhatsAppButton />

      {/* Floating Cart Button */}
      <FloatingCartButton onClick={() => setIsCartOpen(true)} />
    </div>
  );
}
