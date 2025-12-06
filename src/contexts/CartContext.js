// src/contexts/CartContext.js
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedCart = window.localStorage.getItem('petStoreCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.warn('No se pudo cargar el carrito guardado', error);
      return [];
    }
  });

  const [orderType, setOrderType] = useState(null); // 'delivery' or 'pickup'
  const [orderDetails, setOrderDetails] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: '',
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      window.localStorage.setItem('petStoreCart', JSON.stringify(cart));
    } else {
      window.localStorage.removeItem('petStoreCart');
    }
  }, [cart]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
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