'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para optimización de imágenes con lazy loading y cache
 * Implementa técnicas profesionales para mejorar el rendimiento
 */
export function useOptimizedImages(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '200px',
    placeholder = 'blur',
    quality = 75,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  } = options;

  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());
  const observerRef = useRef(null);
  const imageCache = useRef(new Map());

  // Optimizar URL de imagen con parámetros de calidad
  const optimizeImageUrl = useCallback((url, options = {}) => {
    if (!url) return null;

    const {
      width,
      height,
      quality: imgQuality = quality,
      format = 'auto'
    } = options;

    // Si es una URL externa (ej. Cloudinary, Imgix, etc.)
    if (url.includes('cloudinary') || url.includes('imgix') || url.includes('images.unsplash')) {
      const separator = url.includes('?') ? '&' : '?';
      
      let params = [];
      if (width) params.push(`w=${width}`);
      if (height) params.push(`h=${height}`);
      if (imgQuality) params.push(`q=${imgQuality}`);
      if (format) params.push(`fm=${format}`);
      
      return params.length > 0 ? `${url}${separator}${params.join('&')}` : url;
    }

    // Para URLs locales, podrías implementar un servicio de optimización
    return url;
  }, [quality]);

  // Generar placeholder blur
  const generateBlurPlaceholder = useCallback((width = 10, height = 10) => {
    // SVG placeholder simple
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect width="100%" height="100%" fill="url(#gradient)" opacity="0.4"/>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e5e7eb"/>
            <stop offset="100%" style="stop-color:#d1d5db"/>
          </linearGradient>
        </defs>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, []);

  // Lazy loading con Intersection Observer
  const observeImage = useCallback((element, src, options = {}) => {
    if (!element || !src) return;

    const optimizedSrc = optimizeImageUrl(src, options);
    const cacheKey = `${optimizedSrc}-${options.width || ''}-${options.height || ''}`;

    // Verificar cache primero
    if (imageCache.current.has(cacheKey)) {
      element.src = imageCache.current.get(cacheKey);
      setLoadedImages(prev => new Set([...prev, cacheKey]));
      return;
    }

    // Agregar a loading
    setLoadingImages(prev => new Set([...prev, cacheKey]));

    // Configurar observer
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const imgSrc = img.dataset.src;
              
              if (imgSrc) {
                // Crear imagen para precarga
                const tempImg = new Image();
                
                tempImg.onload = () => {
                  img.src = imgSrc;
                  imageCache.current.set(cacheKey, imgSrc);
                  setLoadedImages(prev => new Set([...prev, cacheKey]));
                  setLoadingImages(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(cacheKey);
                    return newSet;
                  });
                };
                
                tempImg.onerror = () => {
                  setFailedImages(prev => new Set([...prev, cacheKey]));
                  setLoadingImages(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(cacheKey);
                    return newSet;
                  });
                };
                
                tempImg.src = imgSrc;
                observerRef.current.unobserve(img);
              }
            }
          });
        },
        {
          threshold,
          rootMargin
        }
      );
    }

    // Configurar elemento
    element.dataset.src = optimizedSrc;
    element.src = placeholder === 'blur' ? generateBlurPlaceholder() : '';
    
    // Observar elemento
    observerRef.current.observe(element);
  }, [optimizeImageUrl, generateBlurPlaceholder, threshold, rootMargin, placeholder]);

  // Precargar imágenes críticas
  const preloadImage = useCallback((src, options = {}) => {
    const optimizedSrc = optimizeImageUrl(src, options);
    const cacheKey = `${optimizedSrc}-${options.width || ''}-${options.height || ''}`;

    if (imageCache.current.has(cacheKey)) {
      return Promise.resolve(imageCache.current.get(cacheKey));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        imageCache.current.set(cacheKey, optimizedSrc);
        resolve(optimizedSrc);
      };
      
      img.onerror = reject;
      img.src = optimizedSrc;
    });
  }, [optimizeImageUrl]);

  // Precargar múltiples imágenes
  const preloadImages = useCallback(async (urls, options = {}) => {
    const promises = urls.map(url => preloadImage(url, options));
    try {
      return await Promise.all(promises);
    } catch (error) {
      console.warn('Error precargando imágenes:', error);
      return [];
    }
  }, [preloadImage]);

  // Limpiar cache
  const clearCache = useCallback(() => {
    imageCache.current.clear();
    setLoadedImages(new Set());
    setFailedImages(new Set());
  }, []);

  // Obtener estado de una imagen
  const getImageState = useCallback((src, options = {}) => {
    const optimizedSrc = optimizeImageUrl(src, options);
    const cacheKey = `${optimizedSrc}-${options.width || ''}-${options.height || ''}`;
    
    return {
      isLoaded: loadedImages.has(cacheKey),
      isLoading: loadingImages.has(cacheKey),
      hasError: failedImages.has(cacheKey)
    };
  }, [optimizeImageUrl, loadedImages, loadingImages, failedImages]);

  // Responsive image srcset
  const generateSrcSet = useCallback((src, breakpoints = [320, 640, 768, 1024, 1280, 1536]) => {
    if (!src) return '';

    return breakpoints
      .map(width => `${optimizeImageUrl(src, { width })} ${width}w`)
      .join(', ');
  }, [optimizeImageUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    // Métodos principales
    observeImage,
    preloadImage,
    preloadImages,
    
    // Utilidades
    optimizeImageUrl,
    generateBlurPlaceholder,
    generateSrcSet,
    getImageState,
    clearCache,
    
    // Estados
    loadedImages,
    loadingImages,
    failedImages,
    
    // Configuración
    sizes,
    quality
  };
}

/**
 * Hook específico para imágenes de productos
 */
export function useProductImages() {
  const imageUtils = useOptimizedImages({
    threshold: 0.1,
    rootMargin: '300px',
    quality: 80,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  });

  // Optimizar imagen de producto específica
  const getProductImage = useCallback((product, options = {}) => {
    if (!product) return null;

    const {
      width = 400,
      height = 300,
      quality = 80,
      crop = 'fill'
    } = options;

    return imageUtils.optimizeImageUrl(product.image, {
      width,
      height,
      quality,
      crop
    });
  }, [imageUtils]);

  // Obtener placeholder para producto
  const getProductPlaceholder = useCallback((product) => {
    if (!product) return imageUtils.generateBlurPlaceholder();
    
    // Podrías generar placeholders más específicos basados en el producto
    return imageUtils.generateBlurPlaceholder(400, 300);
  }, [imageUtils]);

  // Precargar imágenes de una lista de productos
  const preloadProductImages = useCallback(async (products, options = {}) => {
    const imageUrls = products
      .map(product => product.image)
      .filter(Boolean);
    
    return imageUtils.preloadImages(imageUrls, options);
  }, [imageUtils]);

  return {
    ...imageUtils,
    getProductImage,
    getProductPlaceholder,
    preloadProductImages
  };
}

/**
 * Hook para galería de imágenes con zoom y navegación
 */
export function useImageGallery(images = []) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      setCurrentIndex(prev => prev - 1);
      setIsZoomed(false);
    }
  }, [hasPrevious]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
      setIsZoomed(false);
    }
  }, [hasNext]);

  const goToIndex = useCallback((index) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
      setIsZoomed(false);
    }
  }, [images.length]);

  const handleZoom = useCallback((e) => {
    if (!currentImage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
    setIsZoomed(true);
  }, [currentImage]);

  const resetZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, resetZoom]);

  return {
    currentImage,
    currentIndex,
    isZoomed,
    zoomPosition,
    hasPrevious,
    hasNext,
    images,
    goToPrevious,
    goToNext,
    goToIndex,
    handleZoom,
    resetZoom
  };
}
