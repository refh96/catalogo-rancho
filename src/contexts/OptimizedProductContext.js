'use client';
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ProductHashMap, 
  ProductLRUCache, 
  SearchTrie, 
  VirtualScrollManager,
  debounce,
  throttle,
  MemoizationCache,
  LazyLoadManager,
  PerformanceMonitor
} from '@/utils/dataStructures';

const initialProducts = {
  perros: [],
  gatos: [],
  mascotasPequeñas: [],
  accesorios: [],
  farmacia: []
};

const OptimizedProductContext = createContext();

export function OptimizedProductProvider({ children }) {
  // Estructuras de datos optimizadas
  const [productHashMap] = useState(() => new ProductHashMap());
  const [productCache] = useState(() => new ProductLRUCache(50));
  const [searchTrie] = useState(() => new SearchTrie());
  const [virtualScrollManager] = useState(() => new VirtualScrollManager(200, 600));
  const [lazyLoadManager] = useState(() => new LazyLoadManager());
  const [memoCache] = useState(() => new MemoizationCache());
  const [perfMonitor] = useState(() => new PerformanceMonitor());

  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [virtualScrollData, setVirtualScrollData] = useState({});

  // Memoized functions para evitar recálculos
  const getProductsByCategory = useCallback((category) => {
    perfMonitor.startTimer('getProductsByCategory');
    
    // Intentar desde cache primero
    const cacheKey = `category_${category}`;
    const cached = productCache.get(cacheKey);
    if (cached) {
      perfMonitor.endTimer('getProductsByCategory');
      return cached;
    }

    // Obtener desde HashMap optimizado
    const result = productHashMap.getByCategory(category);
    
    // Guardar en cache
    productCache.put(cacheKey, result);
    
    perfMonitor.endTimer('getProductsByCategory');
    return result;
  }, [productHashMap, productCache, perfMonitor]);

  // Búsqueda optimizada con debounce
  const searchProducts = useMemo(() => 
    debounce((query) => {
      perfMonitor.startTimer('searchProducts');
      
      if (!query.trim()) {
        setSearchResults([]);
        perfMonitor.endTimer('searchProducts');
        return;
      }

      // Búsqueda en Trie para autocompletado
      const trieResults = searchTrie.search(query);
      
      // Búsqueda en HashMap para resultados completos
      const hashResults = productHashMap.search(query);
      
      // Combinar y deduplicar resultados
      const allResults = [...new Set([...trieResults, ...hashResults])];
      setSearchResults(allResults);
      
      perfMonitor.endTimer('searchProducts');
    }, 300), [searchTrie, productHashMap, perfMonitor]
  );

  // Virtual Scrolling optimizado
  const getVirtualScrollItems = useCallback((items, scrollTop = 0) => {
    perfMonitor.startTimer('virtualScroll');
    
    const result = virtualScrollManager.getVisibleItems(items, scrollTop);
    setVirtualScrollData(result);
    
    perfMonitor.endTimer('virtualScroll');
    return result;
  }, [virtualScrollManager, perfMonitor]);

  // Cargar productos con optimización
  useEffect(() => {
    const loadProducts = async () => {
      try {
        perfMonitor.startTimer('loadProducts');
        setLoading(true);
        
        const q = query(collection(db, 'products'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          if (!isUpdating) {
            perfMonitor.startTimer('processProducts');
            
            // Limpiar estructuras
            productHashMap.map.clear();
            productCache.clear();
            searchTrie.root = {};
            
            // Procesar productos con estructuras optimizadas
            querySnapshot.forEach((doc) => {
              const productData = doc.data();
              const product = {
                id: doc.id,
                ...productData
              };
              
              // Insertar en todas las estructuras optimizadas
              productHashMap.insert(product);
              searchTrie.insert(product.name, product.id);
              searchTrie.insert(product.category, product.id);
              
              if (product.description) {
                searchTrie.insert(product.description, product.id);
              }
            });
            
            // Actualizar estado tradicional para compatibilidad
            const loadedProducts = Object.keys(initialProducts).reduce((acc, key) => {
              acc[key] = productHashMap.getByCategory(key);
              return acc;
            }, {});
            
            setProducts(loadedProducts);
            
            perfMonitor.endTimer('processProducts');
          }
          setLoading(false);
        });
        
        perfMonitor.endTimer('loadProducts');
        return () => unsubscribe();
      } catch (error) {
        console.error('Error cargando productos:', error);
        setLoading(false);
      }
    };
  
    loadProducts();
  }, [isUpdating, productHashMap, productCache, searchTrie, perfMonitor]);

  // Funciones CRUD optimizadas
  const addProduct = async (category, product) => {
    try {
      perfMonitor.startTimer('addProduct');
      setIsUpdating(true);
      
      const newProductRef = doc(collection(db, 'products'));
      const newProduct = {
        ...product,
        category,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(newProductRef, newProduct);
      
      // Actualizar estructuras locales inmediatamente
      const productWithId = { id: newProductRef.id, ...newProduct };
      productHashMap.insert(productWithId);
      searchTrie.insert(productWithId.name, productWithId.id);
      
      // Invalidar cache
      productCache.clear();
      
      perfMonitor.endTimer('addProduct');
    } catch (error) {
      console.error('Error agregando producto:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateProduct = async (category, productId, updatedProduct) => {
    try {
      perfMonitor.startTimer('updateProduct');
      setIsUpdating(true);
      
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        ...updatedProduct,
        updatedAt: new Date().toISOString()
      });
      
      // Actualizar estructuras locales
      const existingProduct = productHashMap.get(productId);
      if (existingProduct) {
        const updated = { ...existingProduct, ...updatedProduct };
        productHashMap.insert(updated); // Re-insertar para actualizar
        
        // Actualizar Trie si cambió el nombre
        if (updatedProduct.name && updatedProduct.name !== existingProduct.name) {
          searchTrie.insert(updatedProduct.name, productId);
        }
      }
      
      // Invalidar cache
      productCache.clear();
      
      perfMonitor.endTimer('updateProduct');
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteProduct = async (category, productId) => {
    try {
      perfMonitor.startTimer('deleteProduct');
      setIsUpdating(true);
      
      await deleteDoc(doc(db, 'products', productId));
      
      // Eliminar de estructuras locales
      productHashMap.delete(productId);
      
      // Invalidar cache
      productCache.clear();
      
      perfMonitor.endTimer('deleteProduct');
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Obtener producto por ID optimizado
  const getProductById = useCallback((id) => {
    perfMonitor.startTimer('getProductById');
    
    // Intentar desde cache primero
    const cached = productCache.get(id);
    if (cached) {
      perfMonitor.endTimer('getProductById');
      return cached;
    }
    
    // Obtener desde HashMap
    const result = productHashMap.get(id);
    
    // Guardar en cache si existe
    if (result) {
      productCache.put(id, result);
    }
    
    perfMonitor.endTimer('getProductById');
    return result;
  }, [productHashMap, productCache, perfMonitor]);

  // Obtener featured products optimizado
  const getFeaturedProducts = useCallback(() => {
    perfMonitor.startTimer('getFeaturedProducts');
    
    const cacheKey = 'featured_products';
    const cached = productCache.get(cacheKey);
    if (cached) {
      perfMonitor.endTimer('getFeaturedProducts');
      return cached;
    }
    
    // Obtener todos los productos y filtrar
    const allProducts = productHashMap.getAll();
    const featured = allProducts.filter(product => product.isFeatured);
    
    // Ordenar por fecha de creación
    featured.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    // Guardar en cache
    productCache.put(cacheKey, featured);
    
    perfMonitor.endTimer('getFeaturedProducts');
    return featured;
  }, [productHashMap, productCache, perfMonitor]);

  // Memoized values para evitar recálculos
  const value = useMemo(() => ({
    // Datos tradicionales para compatibilidad
    products,
    loading,
    isUpdating,
    
    // Nuevas funcionalidades optimizadas
    searchResults,
    virtualScrollData,
    
    // Funciones optimizadas
    getProductsByCategory,
    searchProducts,
    getVirtualScrollItems,
    getProductById,
    getFeaturedProducts,
    
    // CRUD
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Estructuras de datos (para uso avanzado)
    productHashMap,
    productCache,
    searchTrie,
    virtualScrollManager,
    lazyLoadManager,
    memoCache,
    perfMonitor
  }), [
    products,
    loading,
    isUpdating,
    searchResults,
    virtualScrollData,
    getProductsByCategory,
    searchProducts,
    getVirtualScrollItems,
    getProductById,
    getFeaturedProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    productHashMap,
    productCache,
    searchTrie,
    virtualScrollManager,
    lazyLoadManager,
    memoCache,
    perfMonitor
  ]);

  return (
    <OptimizedProductContext.Provider value={value}>
      {children}
    </OptimizedProductContext.Provider>
  );
}

export function useOptimizedProducts() {
  const context = useContext(OptimizedProductContext);
  if (!context) {
    throw new Error('useOptimizedProducts must be used within OptimizedProductProvider');
  }
  return context;
}
