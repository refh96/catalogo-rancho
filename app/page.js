'use client';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/contexts/AuthContext';
import { useProducts } from '../src/contexts/ProductContext';
import { useCart } from '../src/contexts/CartContext';
import CartIcon from '../src/components/CartIcon';
import CartModal from '../src/components/CartModal';

export default function Home() {
  const { user, login, logout } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [activeCategory, setActiveCategory] = useState('perros');
  const [showLogin, setShowLogin] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'perros',
    image: ''
  });
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { addToCart } = useCart();
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    let result = products[activeCategory] || [];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(term)
      );
    }

    // Filtrar por precio
    if (priceFilter === 'under10k') {
      result = result.filter(product => product.price < 10000);
    } else if (priceFilter === '10k-20k') {
      result = result.filter(product => product.price >= 10000 && product.price <= 20000);
    } else if (priceFilter === 'over20k') {
      result = result.filter(product => product.price > 20000);
    }

    // Ordenar
    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else {
      // Ordenar por nombre por defecto
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, activeCategory, searchTerm, priceFilter, sortBy]);


  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(loginData.username, loginData.password);
    if (result.success) {
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
      setLoginError('');
    } else {
      setLoginError(result.error || 'Error al iniciar sesión');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const newProduct = {
      name: formData.name,
      price: Number(formData.price),
      image: formData.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(formData.name)}`
    };
    
    if (editingProduct) {
      updateProduct(editingProduct.category, editingProduct.id, newProduct);
    } else {
      addProduct(formData.category, newProduct);
    }
    
    setFormData({
      name: '',
      price: '',
      category: 'perros',
      image: ''
    });
    setEditingProduct(null);
    setShowAddProduct(false);
  };

  const handleEditProduct = (product, category) => {
    setFormData({
      name: product.name,
      price: product.price,
      category: category,
      image: product.image
    });
    setEditingProduct({ id: product.id, category });
    setShowAddProduct(true);
  };

  const handleDeleteProduct = (productId, category) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      deleteProduct(category, productId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Rancho Mascotas Hualpén</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-indigo-600 focus:outline-none"
              aria-label="Carrito de compras"
            >
              <CartIcon />
            </button>
            
            {!user ? (
              <button 
                onClick={() => setShowLogin(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Admin
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Hola, {user.username}</span>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-indigo-700 rounded-lg shadow-xl overflow-hidden mb-12">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 lg:py-16">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="block">Todo para tus mascotas</span>
                  <span className="block text-indigo-200">En un solo lugar</span>
                </h2>
                <p className="mt-3 max-w-3xl text-lg text-indigo-100">
                  Encuentra los mejores productos para el cuidado y entretenimiento de tus mascotas.
                </p>
              </div>
              <div className="mt-12 relative lg:mt-0">
                <div className="relative mx-auto w-full rounded-lg shadow-lg">
                  <div className="relative block w-full bg-white rounded-lg overflow-hidden">
                    <img
                      className="w-full h-64 object-cover"
                      src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
                      alt="Mascotas felices"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuestros Productos</h2>
          
          {/* Filtros de categoría */}
          <div className="flex space-x-4 mb-4 overflow-x-auto pb-2">
            {Object.keys(products).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category === 'perros' && '🐶 Perros'}
                {category === 'gatos' && '🐱 Gatos'}
                {category === 'mascotasPequeñas' && '🐹 Mascotas Pequeñas'}
              </button>
            ))}
          </div>
          
          {/* Barra de búsqueda y filtros */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Buscador */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              {/* Filtro por precio */}
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">Todos los precios</option>
                <option value="under10k">Menos de $10.000</option>
                <option value="10k-20k">$10.000 - $20.000</option>
                <option value="over20k">Más de $20.000</option>
              </select>
              
              {/* Ordenar por */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="name">Ordenar por nombre</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>
            
            {/* Contador de resultados */}
            <div className="mt-3 text-sm text-gray-500">
              Mostrando {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {searchTerm && ` para "${searchTerm}"`}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-1 text-gray-500">Intenta con otros términos de búsqueda o filtros.</p>
                {(searchTerm || priceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPriceFilter('all');
                    }}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="w-full h-48 bg-white rounded-t-lg overflow-hidden border-b border-gray-200">
                    <div className="w-full h-full flex items-center justify-center p-4">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={200}
                          height={200}
                          className="w-auto h-auto max-h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/200?text=Sin+imagen';
                          }}
                          unoptimized={!product.image.startsWith('http')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <span className="text-gray-400">Sin imagen</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-indigo-600 font-bold">${product.price.toLocaleString('es-CL')}</p>
                    <div className="mt-4 flex justify-between items-center">
                      <button 
                        onClick={() => addToCart({ ...product, category: activeCategory })}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm transition-colors duration-200"
                      >
                        Agregar al carrito
                      </button>
                      {user && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditProduct(product, activeCategory)}
                            className="p-1 text-yellow-600 hover:text-yellow-700"
                            title="Editar producto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.793.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id, activeCategory)}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Eliminar producto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {user && (
          <div className="fixed bottom-8 right-8">
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  price: '',
                  category: 'perros',
                  image: ''
                });
                setShowAddProduct(true);
              }}
              className="p-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        )}

        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Iniciar sesión como administrador</h3>
                <button 
                  onClick={() => {
                    setShowLogin(false);
                    setLoginError('');
                    setLoginData({ username: '', password: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                {loginError && (
                  <div className="mb-4 text-sm text-red-600">
                    {loginError}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Iniciar sesión
                </button>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Usuario: <span className="font-mono">admin</span></p>
                  <p>Contraseña: <span className="font-mono">admin123</span></p>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddProduct(false);
                    setFormData({
                      name: '',
                      price: '',
                      category: 'perros',
                      image: ''
                    });
                    setEditingProduct(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddProduct}>
                <div className="mb-4">
                  <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    id="product-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio (CLP)
                  </label>
                  <input
                    type="number"
                    id="product-price"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    min="0"
                    step="100"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="product-category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="perros">Perros</option>
                    <option value="gatos">Gatos</option>
                    <option value="mascotasPequeñas">Mascotas Pequeñas</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="product-image" className="block text-sm font-medium text-gray-700 mb-1">
                    URL de la Imagen (opcional)
                  </label>
                  <input
                    type="url"
                    id="product-image"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">Deja vacío para usar una imagen predeterminada</p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProduct(false);
                      setFormData({
                        name: '',
                        price: '',
                        category: 'perros',
                        image: ''
                      });
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingProduct ? 'Guardar Cambios' : 'Agregar Producto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Rancho Mascotas Hualpén. Todos los derechos reservados.
          </p>
        </div>
      </footer>
      
      {/* Modal del Carrito */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}