'use client';
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

// Animaciones CSS personalizadas para mayor fluidez
const customStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .scroll-smooth-custom {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .snap-center-custom {
    scroll-snap-align: center;
    scroll-snap-stop: always;
  }

  @keyframes scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  .carousel-track {
    display: flex;
    gap: 1.5rem;
    animation: scroll 30s linear infinite;
    width: max-content;
  }

  .carousel-track:hover {
    animation-play-state: paused;
  }

  @media (min-width: 640px) {
    .carousel-track {
      gap: 2rem;
      animation-duration: 35s;
    }
  }

  @media (min-width: 1024px) {
    .carousel-track {
      gap: 2.5rem;
      animation-duration: 40s;
    }
  }
`;

// Inyectar estilos personalizados
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}

const getProductAnchorId = (product) => {
  if (!product) return '';
  const rawKey = product.id || product.barcode || product.name || 'product';
  return `product-${rawKey.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
};

const ProductCard = memo(({ product, onProductClick, index, totalProducts }) => {
  return (
    <div
      className="group flex-shrink-0 snap-center rounded-3xl border border-white/40 bg-white/10 backdrop-blur px-4 pb-4 w-[250px] sm:w-[280px] lg:w-[300px] shadow-[0_15px_45px_rgba(15,23,42,0.12)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_25px_70px_rgba(79,70,229,0.3)] hover:scale-[1.02]"
      style={{
        scrollSnapAlign: 'center',
        scrollSnapStop: 'always',
        flex: '0 0 auto',
        animation: `slideIn 0.6s ease-out ${index * 0.1}s both`,
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
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-black/20 opacity-0 transition-all duration-500 group-hover:opacity-100" />
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                loading="lazy"
                className="object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
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
        <p className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-indigo-600 transition-all duration-300 group-hover:bg-indigo-100 group-hover:scale-105">
          {product.category || 'General'}
        </p>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 line-clamp-2 transition-colors duration-300 group-hover:text-indigo-900">{product.name}</h3>
          <p className="text-2xl font-black text-slate-900 mt-1 transition-all duration-300 group-hover:text-indigo-600 group-hover:scale-105">
            ${parseInt(product.price || 0).toLocaleString('es-CL')}
          </p>
        </div>
        <p className="text-xs text-slate-500 line-clamp-2 transition-colors duration-300 group-hover:text-slate-600">
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

  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return Object.values(products)
      .flat()
      .filter((product) => product?.isFeatured);
  }, [products]);

  // Duplicar productos para crear efecto infinito con animación CSS
  const duplicatedProducts = useMemo(() => {
    if (featuredProducts.length === 0) return [];
    // Duplicar suficientes veces para crear efecto infinito fluido
    return [...featuredProducts, ...featuredProducts, ...featuredProducts];
  }, [featuredProducts]);

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

  // Movimiento perpetuo manejado por animación CSS para mejor rendimiento y fluidez
  // No necesitamos auto-scroll JavaScript

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
    <section className="relative py-0 sm:py-1 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/70 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/70 to-transparent pointer-events-none" />
      <div className="relative container mx-auto px-4">
        <div className="flex flex-col items-center gap-0 text-center">
          <h2 className="gradient-title text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500">
            Productos destacados
          </h2>
        </div>

        {isAdmin && (
          <div className="mt-0 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-500">
            Panel admin
          </div>
        )}

        <div className="relative mt-1 overflow-hidden">
          <div className="carousel-track">
            {duplicatedProducts.map((product, index) => (
              <ProductCard
                key={`${product.id}-${index}`}
                product={product}
                onProductClick={handleProductClick}
                index={index}
                totalProducts={duplicatedProducts.length}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsCarousel;
