// app/layout.js
'use client';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ProductProvider } from '../src/contexts/ProductContext';
import { CartProvider } from '../src/contexts/CartContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f59e0b" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ProductProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </ProductProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}