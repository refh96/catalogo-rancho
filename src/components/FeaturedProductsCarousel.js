'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

const getProductAnchorId = (product) => {
  if (!product) return '';
  const rawKey = product.id || product.barcode || product.name || 'product';
  return `product-${rawKey.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
};

const ProductCard = memo(({ product, onProductClick }) => {
  return (
    <div
      className="group flex-shrink-0 snap-center rounded-3xl border border-white/40 bg-white/10 backdrop-blur px-4 pb-4 w-[250px] sm:w-[280px] shadow-[0_15px_45px_rgba(15,23,42,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(79,70,229,0.25)]"
      style={{
        scrollSnapAlign: 'center',
        scrollSnapStop: 'always',
        flex: '0 0 auto',
      }}
    >
      <div className="relative mt-4">
        <Link
          href={`#${getProductAnchorId(product)}`}
          scroll={false}
          onClick={(event) => onProductClick(event, product)}
          className="block rounded-2xl overflow-hidden"
        >
          <div className="relative h-44 w-full" style={{ position: 'relative' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10 opacity-0 transition group-hover:opacity-100" />
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                loading="lazy"
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 60vw, 30vw"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
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
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

const FeaturedProductsCarousel = ({ onProductSelect }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { products, loading, updateProduct } = useProducts();
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return Object.values(products)
      .flat()
      .filter((product) => product?.isFeatured);
  }, [products]);

  // Duplicar productos para crear efecto infinito - Eliminado, ahora ciclo natural
  const duplicatedProducts = featuredProducts; // Sin duplicación, ciclo natural

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
    
    // IMPORTANTE: No detener el ciclo del carrusel al hacer clic en producto
    // Solo llamar a onProductSelect sin afectar el auto-scroll
    
    // Llamar a la función del padre sin detener el carrusel
    if (onProductSelect) {
      onProductSelect(product);
    }
    
    // No hacer nada más - dejar que el ciclo continúe normalmente
    // El usuario puede hacer clic sin detener el auto-scroll
  };

  // Sistema de movimiento profesional y robusto - Arquitectura limpia
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || featuredProducts.length <= 1) return;

    // Estado local simple
    let autoScrollTimer = null;
    let isUserInteracting = false;
    let isTransitioning = false;
    let currentLocalIndex = 0;
    let touchStartX = 0;
    let isDragging = false;

    const isMobile = window.innerWidth < 640;
    const cardWidth = isMobile ? 250 : 280;
    const gap = isMobile ? 16 : 24;
    const totalCardWidth = cardWidth + gap;

    // Cálculo de posición simple y robusto
    const calculateScrollPosition = (targetIndex) => {
      const containerWidth = container.clientWidth;
      const targetScroll = (targetIndex * totalCardWidth) - (containerWidth / 2) + (cardWidth / 2);
      const maxScroll = container.scrollWidth - container.clientWidth;
      return Math.max(0, Math.min(targetScroll, maxScroll));
    };

    // Movimiento simple y confiable
    const moveToIndex = (targetIndex, smooth = true) => {
      if (isTransitioning) return;
      
      isTransitioning = true;
      currentLocalIndex = targetIndex;
      setCurrentIndex(targetIndex);
      
      container.scrollTo({
        left: calculateScrollPosition(targetIndex),
        behavior: smooth ? 'smooth' : 'auto'
      });
      
      setTimeout(() => {
        isTransitioning = false;
        if (!isUserInteracting) {
          startAutoScroll();
        }
      }, 500);
    };

    // Auto-scroll simple y profesional
    const startAutoScroll = () => {
      if (autoScrollTimer) clearTimeout(autoScrollTimer);
      
      autoScrollTimer = setTimeout(() => {
        if (!isUserInteracting && !isTransitioning) {
          const nextIndex = (currentLocalIndex + 1) % featuredProducts.length;
          moveToIndex(nextIndex);
        }
        startAutoScroll();
      }, isMobile ? 2500 : 3000);
    };

    const stopAutoScroll = () => {
      if (autoScrollTimer) {
        clearTimeout(autoScrollTimer);
        autoScrollTimer = null;
      }
    };

    // Touch handlers profesionales
    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      isDragging = true;
      isUserInteracting = true;
      stopAutoScroll();
      container.style.overflowY = 'hidden';
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.touches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 10) {
        e.preventDefault();
        const currentScroll = container.scrollLeft;
        container.scrollLeft = currentScroll - (deltaX * 0.3);
      }
    };

    const handleTouchEnd = (e) => {
      if (!isDragging) return;
      
      isDragging = false;
      container.style.overflowY = '';
      
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const swipeThreshold = isMobile ? 50 : 80;
      
      if (Math.abs(deltaX) > swipeThreshold) {
        let targetIndex;
        if (deltaX > 0) {
          targetIndex = currentLocalIndex === 0 ? featuredProducts.length - 1 : currentLocalIndex - 1;
        } else {
          targetIndex = (currentLocalIndex + 1) % featuredProducts.length;
        }
        moveToIndex(targetIndex);
      } else {
        moveToIndex(currentLocalIndex, true);
      }
      
      setTimeout(() => {
        isUserInteracting = false;
        startAutoScroll();
      }, 1000);
    };

    // Mouse handlers profesionales
    const handleMouseEnter = () => {
      if (!isMobile) {
        isUserInteracting = true;
        stopAutoScroll();
      }
    };

    const handleMouseLeave = () => {
      if (!isMobile) {
        isUserInteracting = false;
        startAutoScroll();
      }
    };

    // Indicadores profesionales
    const handleIndicatorClick = (e) => {
      const targetIndex = parseInt(e.target.dataset.index);
      if (targetIndex >= 0 && targetIndex < featuredProducts.length) {
        isUserInteracting = true;
        moveToIndex(targetIndex);
        
        setTimeout(() => {
          isUserInteracting = false;
          startAutoScroll();
        }, 1000);
      }
    };

    // Event listeners profesionales
    if (isMobile) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      container.addEventListener('gesturestart', (e) => e.preventDefault());
      container.addEventListener('gesturechange', (e) => e.preventDefault());
    } else {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    container.addEventListener('click', handleIndicatorClick);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoScroll();
      } else {
        setTimeout(() => startAutoScroll(), 500);
      }
    });

    // Inicialización profesional
    moveToIndex(0, false);
    setTimeout(() => startAutoScroll(), 1000);

    // Cleanup profesional
    return () => {
      stopAutoScroll();
      
      if (isMobile) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('gesturestart', (e) => e.preventDefault());
        container.removeEventListener('gesturechange', (e) => e.preventDefault());
      } else {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      
      container.removeEventListener('click', handleIndicatorClick);
      container.style.overflowY = '';
    };
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
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/70 to-transparent pointer-events-none" />
      <div className="relative container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="gradient-title mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500">
            Productos destacados
          </h2>
        </div>

        {isAdmin && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-500">
            Panel admin
          </div>
        )}

        <div className="relative mt-8">
          <div
            ref={scrollRef}
            className="flex gap-6 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0 snap-x snap-mandatory"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              scrollSnapType: 'x mandatory', // Snap exacto a productos
            }}
          >
            {duplicatedProducts.map((product, index) => (
              <ProductCard
                key={`${product.id}-${index}`}
                product={product}
                onProductClick={handleProductClick}
              />
            ))}
          </div>

          {/* Indicadores de progreso mejorados - Optimizados para móvil */}
          {featuredProducts.length > 1 && (
            <div className="mt-6 flex justify-center gap-2 px-4">
              {featuredProducts.map((_, index) => (
                <button
                  key={`indicator-${index}`}
                  data-indicator={index}
                  onClick={() => {
                    const container = scrollRef.current;
                    if (!container) return;
                    
                    const isMobile = window.innerWidth < 640;
                    const cardWidth = isMobile ? 250 : 280;
                    const gap = isMobile ? 16 : 24;
                    const totalCardWidth = cardWidth + gap;
                    const containerWidth = container.clientWidth;
                    
                    const targetScroll = (index * totalCardWidth) - (containerWidth / 2) + (cardWidth / 2);
                    const maxScroll = container.scrollWidth - container.clientWidth;
                    const boundedScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                    
                    // Actualizar estado inmediatamente
                    setCurrentIndex(index);
                    
                    // Detener movimiento automático temporalmente
                    const stopAutoScrollTemporarily = () => {
                      const event = new CustomEvent('userInteraction', { detail: { index } });
                      container.dispatchEvent(event);
                    };
                    
                    stopAutoScrollTemporarily();
                    
                    container.scrollTo({
                      left: boundedScroll,
                      behavior: 'smooth'
                    });
                  }}
                  className={`transition-all duration-300 ${
                    window.innerWidth < 640 
                      ? `w-3 h-3 rounded-full ${
                          index === currentIndex % featuredProducts.length
                            ? 'bg-indigo-600 shadow-md shadow-indigo-600/30 scale-125'
                            : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
                        }`
                      : `w-2 h-2 rounded-full hover:scale-110 ${
                          index === currentIndex % featuredProducts.length
                            ? 'bg-indigo-600 w-8 shadow-lg shadow-indigo-600/30'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`
                  }`}
                  aria-label={`Ir al producto ${index + 1}`}
                  aria-current={index === currentIndex % featuredProducts.length ? 'true' : 'false'}
                  style={{ touchAction: 'manipulation' }} // Prevenir zoom en móvil
                />
              ))}
            </div>
          )}

          <div className="mt-6 sm:mt-7 lg:mt-8 px-2 sm:px-4">
            <div className="relative h-1.5 sm:h-2 rounded-full bg-white/35 border border-white/50 backdrop-blur-xl overflow-hidden shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
              <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 shadow-[0_8px_20px_rgba(99,102,241,0.35)]" />
              <div className="absolute inset-0 opacity-50 bg-gradient-to-r from-white/20 via-transparent to-white/20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsCarousel;
