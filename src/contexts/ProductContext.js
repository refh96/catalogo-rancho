'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const initialProducts = {
  perros: [],
  gatos: [],
  mascotasPequeñas: [],
  accesorios: [],
  farmacia: []
};

const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar productos desde Firestore
  useEffect(() => {
  const loadProducts = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'products'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        // Solo actualizar si no estamos en medio de una actualización
        if (!isUpdating) {
          // Crear un nuevo objeto con arrays vacíos para evitar reutilizar referencias
          const loadedProducts = Object.keys(initialProducts).reduce((acc, key) => {
            acc[key] = [];
            return acc;
          }, {});
          
          querySnapshot.forEach((doc) => {
            const productData = doc.data();
            const category = productData.category;
            
            if (!loadedProducts[category]) {
              loadedProducts[category] = [];
            }
            
            // Verificar si el producto ya existe en el estado
            const existingProductIndex = loadedProducts[category].findIndex(p => p.id === doc.id);
            
            if (existingProductIndex === -1) {
              // Si no existe, agregarlo
              loadedProducts[category].push({
                id: doc.id,
                ...productData
              });
            } else {
              // Si existe, actualizarlo
              loadedProducts[category][existingProductIndex] = {
                id: doc.id,
                ...productData
              };
            }
          });
          
          setProducts(loadedProducts);
        }
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error cargando productos:', error);
      setLoading(false);
    }
  };
  
  loadProducts();
}, [isUpdating]);

  const addProduct = async (category, product) => {
  try {
    setIsUpdating(true); // Indicar que estamos actualizando
    const newProductRef = doc(collection(db, 'products'));
    await setDoc(newProductRef, {
      ...product,
      category,
      createdAt: new Date().toISOString()
    });
    // No actualizamos el estado local aquí, lo manejará onSnapshot
  } catch (error) {
    console.error('Error agregando producto:', error);
    throw error;
  } finally {
    setIsUpdating(false); // Indicar que terminamos de actualizar
  }
};

  const updateProduct = async (category, productId, updatedProduct) => {
  try {
    setIsUpdating(true); // Indicar que estamos actualizando
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...updatedProduct,
      category, // Incluir la categoría en la actualización
      updatedAt: new Date().toISOString()
    });
    // No actualizamos el estado local aquí, lo manejará onSnapshot
  } catch (error) {
    console.error('Error actualizando producto:', error);
    throw error;
  } finally {
    setIsUpdating(false); // Indicar que terminamos de actualizar
  }
};

  const deleteProduct = async (category, productId) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      // No es necesario actualizar el estado local ya que onSnapshot lo manejará
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  };

  return (
    <ProductContext.Provider value={{ 
      products, 
      addProduct, 
      updateProduct, 
      deleteProduct,
      loading
    }}>
      {children}
    </ProductContext.Provider>
  );
}

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts debe ser usado dentro de un ProductProvider');
  }
  return context;
};
