'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOptimizedProducts } from '@/contexts/OptimizedProductContext';
import { throttle } from '@/utils/dataStructures';

const VirtualizedProductList = ({ 
  products,
  itemHeight = 280,
  containerHeight = 600,
  onProductClick,
  className = "",
  loadingComponent: LoadingComponent,
  emptyComponent: EmptyComponent 
}) => {
  const { getVirtualScrollItems, lazyLoadManager } = useOptimizedProducts();
  
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleItems, setVisibleItems] = useState([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const [isScrolling, setIsScrolling] = useState(false);
  
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const observerRef = useRef(null);
  
  // Calcular items visibles con virtual scrolling
  const virtualData = useMemo(() => {
    return getVirtualScrollItems(products, scrollTop);
  }, [products, scrollTop, getVirtualScrollItems]);

  // Throttle para scroll events
  const throttledScroll = useMemo(
    () => throttle((e) => {
      setScrollTop(e.target.scrollTop);
      setIsScrolling(true);
      
      // Reset scrolling state after scroll ends
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }, 16), // ~60fps
    []
  );

  // Manejar scroll
  const handleScroll = useCallback((e) => {
    throttledScroll(e);
  }, [throttledScroll]);

  // Observer para lazy loading de imágenes
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observerRef.current.unobserve(img);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '200px', // Cargar imágenes 200px antes de que sean visibles
        threshold: 0.1
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Observer para container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Preload items cercanos
  useEffect(() => {
    if (virtualData.items.length === 0) return;

    const preloadStart = Math.max(0, virtualData.startIndex - 5);
    const preloadEnd = Math.min(products.length, virtualData.endIndex + 5);
    const itemsToPreload = products.slice(preloadStart, preloadEnd);

    // Preload imágenes
    itemsToPreload.forEach(product => {
      if (product.image) {
        const img = new Image();
        img.src = product.image;
      }
    });
  }, [virtualData, products]);

  // Memoized ProductItem para evitar re-renders
  const ProductItem = useMemo(() => {
    return ({ product, index, style }) => {
      const [imageLoaded, setImageLoaded] = useState(false);
      const [isHovered, setIsHovered] = useState(false);

      const handleImageLoad = useCallback(() => {
        setImageLoaded(true);
      }, []);

      const handleClick = useCallback(() => {
        if (onProductClick) {
          onProductClick(product);
        }
      }, [product, onProductClick]);

      return (
        <div
          style={style}
          className="absolute left-0 right-0 flex-shrink-0 px-4"
        >
          <div
            className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform ${
              isHovered ? 'scale-105 -translate-y-1' : 'scale-100 translate-y-0'
            } ${isScrolling ? 'transition-none' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
          >
            {/* Imagen del producto */}
            <div className="relative h-48 w-full rounded-t-xl overflow-hidden bg-gray-100">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              <img
                data-src={product.image || '/placeholder-product.png'}
                alt={product.name}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
              />
              
              {/* Badge de categoría */}
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur text-gray-800">
                  {product.category}
                </span>
              </div>
              
              {/* Badge de stock */}
              {product.stock <= 0 && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/90 backdrop-blur text-white">
                    Sin stock
                  </span>
                </div>
              )}
            </div>
            
            {/* Información del producto */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                {product.name}
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-indigo-600">
                  ${parseInt(product.price || 0).toLocaleString('es-CL')}
                </span>
                
                {product.isFeatured && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⭐ Destacado
                  </span>
                )}
              </div>
              
              {/* Descripción corta */}
              {product.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    };
  }, [onProductClick, isScrolling]);

  // Loading component
  if (!LoadingComponent) {
    LoadingComponent = () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      </div>
    );
  }

  // Empty component
  if (!EmptyComponent) {
    EmptyComponent = () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyComponent />;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Contenedor virtualizado */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-xl border border-gray-200"
        style={{ height: containerSize.height }}
        onScroll={handleScroll}
      >
        {/* Espaciador total */}
        <div
          style={{
            height: virtualData.totalHeight,
            position: 'relative'
          }}
        >
          {/* Items visibles */}
          {virtualData.items.map((product, index) => {
            const actualIndex = virtualData.startIndex + index;
            const style = {
              top: actualIndex * itemHeight,
              height: itemHeight,
              position: 'absolute',
              width: '100%'
            };

            return (
              <ProductItem
                key={product.id}
                product={product}
                index={actualIndex}
                style={style}
              />
            );
          })}
        </div>
      </div>

      {/* Indicador de scroll */}
      {isScrolling && (
        <div className="absolute bottom-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          {virtualData.startIndex + 1}-{virtualData.endIndex} de {products.length}
        </div>
      )}

      {/* Performance info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black/75 text-white px-2 py-1 rounded text-xs font-mono">
          Items: {virtualData.items.length} / {products.length}
        </div>
      )}
    </div>
  );
};

export default VirtualizedProductList;
