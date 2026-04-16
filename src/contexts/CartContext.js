// src/contexts/CartContext.js
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const [orderType, setOrderType] = useState(null); // 'delivery' or 'pickup'
  const [orderDetails, setOrderDetails] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: '',
  });

  // Rehidratar carrito solo en el cliente para mantener SSR estable
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedCart = window.localStorage.getItem('petStoreCart');
      if (!savedCart) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart(JSON.parse(savedCart));
    } catch (error) {
      console.warn('No se pudo cargar el carrito guardado', error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      window.localStorage.setItem('petStoreCart', JSON.stringify(cart));
    } else {
      window.localStorage.removeItem('petStoreCart');
    }
  }, [cart]);

  // Sincronizar carrito entre pestañas en tiempo real
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === 'petStoreCart') {
        try {
          const newCart = e.newValue ? JSON.parse(e.newValue) : [];
          setCart(newCart);
        } catch (error) {
          console.warn('Error sincronizando carrito:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      let newCart;
      
      if (existingItem) {
        newCart = prevCart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      } else {
        newCart = [...prevCart, { ...product, quantity: 1 }];
      }
      
      // Emitir evento personalizado para sincronización instantánea
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: newCart }));
      }
      
      return newCart;
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setOrderType(null);
    setOrderDetails({
      name: '',
      phone: '',
      address: '',
      paymentMethod: '',
    });
  };

  const isInCart = (product) => {
    return cart.some(item => item.id === product.id);
  };

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        orderType,
        setOrderType,
        orderDetails,
        setOrderDetails,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};