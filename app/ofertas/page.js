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

// Constantes para redes sociales
const CATALOG_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ranchomascotas.cl/';
const CATALOG_SHARE_MESSAGE = 'Descubre el catálogo de Rancho Mascotas';

const CATALOG_SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    accent: 'text-green-600',
    buildUrl: (message, url) => `https://api.whatsapp.com/send?text=${encodeURIComponent(`${message}\n${url}`)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M12 2A10 10 0 002.05 14.32 1 1 0 003 15h1v4a1 1 0 001.6.8l2.77-2.08A9.94 9.94 0 0012 22a10 10 0 000-20zm5.53 14.47l-.22.62a.8.8 0 01-.76.54 7 7 0 01-6.31-3.87 6.6 6.6 0 01-.71-2.84.8.8 0 01.55-.77l.62-.21a.81.81 0 01.9.33l1 1.53a.8.8 0 01.08.73 1.39 1.39 0 00.09 1s.49.86 1.12 1.37c.61.48 1.31.71 1.31.71a.8.8 0 01.55.53l.47 1.48a.79.79 0 01-.02.64z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Facebook',
    accent: 'text-blue-600',
    buildUrl: (_message, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M13 22v-7h3l.5-3H13V9.5A1.5 1.5 0 0114.5 8H17V5h-2.5A4.5 4.5 0 0010 9.5V12H7v3h3v7z" />
      </svg>
    )
  },
  {
    id: 'x',
    label: 'X',
    accent: 'text-gray-900',
    buildUrl: (message, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${message} ${url}`)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M18.244 3H21l-6.557 7.49L22 21h-4.845l-4.06-5.253L8.329 21H3.244l6.978-7.972L3 3h4.95l3.693 4.837zM17.4 19h1.34L7.05 5H5.59z" />
      </svg>
    )
  },
  {
    id: 'telegram',
    label: 'Telegram',
    accent: 'text-sky-500',
    buildUrl: (message, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M9.04 15.803l-.376 5.297c.54 0 .773-.232 1.052-.51l2.526-2.415 5.232 3.83c.96.53 1.64.252 1.89-.89l3.422-16.052h.001c.304-1.413-.51-1.965-1.45-1.62L1.504 10.447C.124 10.982.133 11.76 1.257 12.098l5.232 1.63 12.163-7.66c.572-.378 1.095-.169.665.209z" />
      </svg>
    )
  }
];

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
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 mb-3">Comparte nuestro catálogo</p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
              {CATALOG_SOCIAL_LINKS.map((network) => (
                <a
                  key={network.id}
                  href={network.buildUrl(CATALOG_SHARE_MESSAGE, CATALOG_BASE_URL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${network.accent}`}
                >
                  <span className="inline-flex items-center justify-center rounded-full bg-white/80 p-1 text-gray-700">
                    {network.icon}
                  </span>
                  {network.label}
                </a>
              ))}
            </div>
            <p className="text-center text-xs sm:text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Rancho Mascotas Hualpén. Todos los derechos reservados.
            </p>
          </div>
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
