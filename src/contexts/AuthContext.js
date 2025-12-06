'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedUser = window.localStorage.getItem('user');
    if (!savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      // La hidratación SSR necesita inmutabilidad entre servidor y cliente; cargamos el usuario recién al montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(parsed);
    } catch (error) {
      console.warn('No se pudo parsear el usuario guardado', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem('user', JSON.stringify(user));
    } else {
      window.localStorage.removeItem('user');
    }
  }, [user]);

  const login = (username, password) => {
    if (username === 'admin' && password === 'admin123') {
      const user = { username, role: 'admin' };
      setUser(user);
      return { success: true };
    }
    return { success: false, error: 'Credenciales incorrectas' };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
