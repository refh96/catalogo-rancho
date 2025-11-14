'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const initialProducts = {
  perros: [
 
  ],
  gatos: [
    
  ],
  mascotasPequeñas: [
    
  ]
};

const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);

  useEffect(() => {
    // Cargar productos guardados al iniciar
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      // Usar los productos iniciales si no hay guardados
      setProducts(initialProducts);
      localStorage.setItem('products', JSON.stringify(initialProducts));
    }
  }, []);

  const addProduct = (category, product) => {
    const newProducts = {
      ...products,
      [category]: [...(products[category] || []), { ...product, id: Date.now() }]
    };
    setProducts(newProducts);
    localStorage.setItem('products', JSON.stringify(newProducts));
  };

  const updateProduct = (category, productId, updatedProduct) => {
    const newProducts = {
      ...products,
      [category]: (products[category] || []).map(p => 
        p.id === productId ? { ...p, ...updatedProduct } : p
      )
    };
    setProducts(newProducts);
    localStorage.setItem('products', JSON.stringify(newProducts));
  };

  const deleteProduct = (category, productId) => {
    const newProducts = {
      ...products,
      [category]: (products[category] || []).filter(p => p.id !== productId)
    };
    setProducts(newProducts);
    localStorage.setItem('products', JSON.stringify(newProducts));
  };

  return (
    <ProductContext.Provider value={{ 
      products, 
      addProduct, 
      updateProduct, 
      deleteProduct 
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
