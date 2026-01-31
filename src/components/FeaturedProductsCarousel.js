'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

const getProductAnchorId = (product) => {
  if (!product) return '';
  const rawKey = product.id || product.barcode || product.name || 'product';
  return `product-${rawKey.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
};

const FeaturedProductsCarousel = ({ onProductSelect }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { products, loading, updateProduct } = useProducts();
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef(null);

  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return Object.values(products)
      .flat()
      .filter((product) => product?.isFeatured);
  }, [products]);

  useEffect(() => {
    if (!loading && featuredProducts.length === 0) {
      setError('No hay productos destacados disponibles.');
    } else {
      setError(null);
    }
  }, [featuredProducts, loading]);

  const buildProductPayload = (product, overrides = {}) => {
    if (!product) return null;
    const { id, category, ...productData } = product;
    return { ...productData, ...overrides };
  };

  const handleRemoveFromCarousel = async (product) => {
    if (!isAdmin || !product?.id) return;
    if (!product.category) {
      alert('No se pudo determinar la categoría del producto.');
      return;
    }
    try {
      setProcessingId(product.id);
      const payload = buildProductPayload(product, { isFeatured: false });
      await updateProduct(product.category, product.id, payload);
    } catch (err) {
      console.error('Error al quitar el producto destacado:', err);
      alert('No se pudo actualizar el producto. Intenta nuevamente.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleProductClick = (event, product) => {
    event?.preventDefault();
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const scrollCarousel = (direction = 'right', targetIndex = null) => {
    const container = scrollRef.current;
    if (!container) return;
    
    const isMobile = window.innerWidth < 640;
    const containerWidth = container.clientWidth;
    const cardWidth = isMobile ? 250 : 280;
    const gap = isMobile ? 16 : 24;
    const totalCardWidth = cardWidth + gap;
    
    if (direction === 'reset') {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    
    if (isMobile && typeof targetIndex === 'number') {
      // En móviles, centrar el elemento objetivo
      const targetScroll = (targetIndex * totalCardWidth) - (containerWidth / 2) + (cardWidth / 2);
      const maxScroll = container.scrollWidth - container.clientWidth;
      const boundedScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      
      container.scrollTo({
        left: boundedScroll,
        behavior: 'smooth'
      });
    } else {
      // En escritorio o para navegación básica
      const scrollAmount = direction === 'left' ? -totalCardWidth : totalCardWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || featuredProducts.length <= 1) return;

    let touchStartX = 0;
    let touchEndX = 0;
    let isScrolling = false;
    let autoScrollInterval;

    const isMobile = window.innerWidth < 640;
    const cardWidth = isMobile ? 250 : 280;
    const gap = isMobile ? 16 : 24;
    const totalCardWidth = cardWidth + gap;

    // Manejar el inicio del toque
    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      isScrolling = true;
      clearInterval(autoScrollInterval);
    };

    // Manejar el movimiento del toque
    const handleTouchMove = (e) => {
      if (!isScrolling) return;
      touchEndX = e.touches[0].clientX;
      if (Math.abs(touchStartX - touchEndX) > 10) {
        e.preventDefault();
      }
    };

    // Manejar el final del toque (solo en móviles)
    const handleTouchEnd = () => {
      if (!isScrolling) return;
      
      if (isMobile) {
        const diff = touchStartX - touchEndX;
        const absDiff = Math.abs(diff);
        
        if (absDiff > 30) { // Umbral mínimo para considerar un deslizamiento
          const direction = diff > 0 ? 'right' : 'left';
          const currentScroll = container.scrollLeft;
          const containerWidth = container.clientWidth;
          const centerPosition = currentScroll + (containerWidth / 2);
          const currentIndex = Math.round(centerPosition / totalCardWidth);
          
          let targetIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
          targetIndex = Math.max(0, Math.min(targetIndex, featuredProducts.length - 1));
          
          scrollCarousel(null, targetIndex);
        } else {
          // Si el deslizamiento fue corto, centrar el elemento actual
          const currentScroll = container.scrollLeft;
          const centerPosition = currentScroll + (container.clientWidth / 2);
          const currentIndex = Math.round(centerPosition / totalCardWidth);
          scrollCarousel(null, currentIndex);
        }
      }
      
      isScrolling = false;
      startAutoScroll();
    };

    // Iniciar el auto-desplazamiento
    const startAutoScroll = () => {
      clearInterval(autoScrollInterval);
      
      autoScrollInterval = setInterval(() => {
        if (isScrolling) return;
        
        const currentScroll = container.scrollLeft;
        const containerWidth = container.clientWidth;
        const centerPosition = currentScroll + (containerWidth / 2);
        let currentIndex = Math.round(centerPosition / totalCardWidth);
        
        // Calcular el siguiente índice
        let nextIndex = currentIndex + 1;
        if (nextIndex >= featuredProducts.length) {
          nextIndex = 0;
          container.scrollTo({ left: 0, behavior: 'smooth' });
          return;
        }
        
        if (isMobile) {
          // En móviles, centrar el siguiente elemento
          scrollCarousel(null, nextIndex);
        } else {
          // En escritorio, desplazamiento normal
          scrollCarousel('right');
        }
      }, 4000);
    };

    // Configurar eventos táctiles solo en móviles
    if (isMobile) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // Iniciar auto-desplazamiento
    startAutoScroll();

    return () => {
      clearInterval(autoScrollInterval);
      if (isMobile) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [featuredProducts.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      setScrollProgress(progress);
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [featuredProducts.length]);

  if (loading) {
    return (
      <div className="relative py-10">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-cyan-50" />
        <div className="container relative mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex flex-col items-center text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Destacados</p>
              <h2 className="gradient-title mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400">
                Descubriendo ofertas...
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="rounded-3xl border border-white/60 bg-white/70 shadow-[0_20px_80px_rgba(99,102,241,0.15)] p-4 animate-pulse"
                >
                  <div className="h-40 rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!featuredProducts.length) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white/80 border border-dashed border-blue-200 rounded-xl p-6 text-center text-sm text-gray-600">
            {isAdmin ? (
              <>
                <p>No hay productos destacados todavía.</p>
                <p className="mt-2 text-gray-500">Desde el catálogo puedes elegir cuáles aparecerán aquí.</p>
              </>
            ) : (
              <p>No hay productos destacados disponibles en este momento.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-cyan-50" />
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/70 to-transparent pointer-events-none" />
      <div className="relative container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="gradient-title mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400">
            Productos destacados
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
              aria-label="Desplazar carrusel a la izquierda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
              aria-label="Desplazar carrusel a la derecha"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-500">
            Panel admin
          </div>
        )}

        <div className="relative mt-8">
          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-4 sm:px-0"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className="group flex-shrink-0 snap-center rounded-3xl border border-white/80 bg-white/90 backdrop-blur px-4 pb-4 w-[250px] sm:w-[280px] shadow-[0_15px_45px_rgba(15,23,42,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(79,70,229,0.25)]"
                style={{
                  scrollSnapAlign: 'center',
                  flex: '0 0 auto',
                }}
              >
                <div className="relative mt-4">
                  <Link
                    href={`#${getProductAnchorId(product)}`}
                    scroll={false}
                    onClick={(event) => handleProductClick(event, product)}
                    className="block rounded-2xl overflow-hidden"
                  >
                    <div className="relative h-44 w-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10 opacity-0 transition group-hover:opacity-100" />
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 60vw, 30vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 text-sm">
                          Sin imagen
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
                <div className="space-y-3 pt-5">
                  <p className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-indigo-600">
                    {product.category || 'General'}
                  </p>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">{product.name}</h3>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      ${parseInt(product.price || 0).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    Toca para abrir detalles y agregar rápidamente al carrito.
                  </p>
                </div>
                {isAdmin && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <button
                      disabled={processingId === product.id}
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFromCarousel(product);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {processingId === product.id ? 'Actualizando…' : 'Quitar de destacados'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-7 lg:mt-8 px-2 sm:px-4">
            <div className="relative h-1.5 sm:h-2 rounded-full bg-white/35 border border-white/50 backdrop-blur-xl overflow-hidden shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 shadow-[0_8px_20px_rgba(99,102,241,0.35)] transition-all duration-500"
                style={{ width: `${Math.min(Math.max(scrollProgress, 0), 1) * 100}%` }}
              />
              <div className="absolute inset-0 opacity-50 bg-gradient-to-r from-white/20 via-transparent to-white/20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsCarousel;
