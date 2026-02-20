'use client';
import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../../src/contexts/CartContext';
import { useProducts } from '../../../src/contexts/ProductContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import CartIcon from '../../../src/components/CartIcon';
import WhatsAppButton from '../../../src/components/WhatsAppButton';

export default function ProductoPage({ params }) {
  const router = useRouter();
  const { addToCart, isInCart } = useCart();
  const { getProductBySlug, products } = useProducts();
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  useEffect(() => {
    const loadProduct = async () => {
      const resolvedParams = await params;
      const product = getProductBySlug(resolvedParams.slug);
      setSelectedProduct(product);
    };
    
    loadProduct();
  }, [params, getProductBySlug]);

  if (!selectedProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cargado Producto</h1>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(selectedProduct);
    // Mostrar notificación simple
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
    notification.textContent = `¡${selectedProduct.name} se ha añadido al carrito!`;
    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2 cursor-pointer">
              <Image
                src="https://i.ibb.co/twMHRJmQ/503853895-17910857019133345-7677598013054732096-n.jpg"
                alt="Logo Rancho de Mascotas Hualpén"
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 object-cover"
              />
              <h1 className="hidden sm:block text-lg sm:text-2xl font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Rancho Mascotas Hualpén
              </h1>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href="/"
                className="px-2 py-1 text-xs sm:px-3 sm:py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Inicio
              </Link>
              <Link 
                href="/encuentrenos"
                className="px-2 py-1 text-xs sm:px-3 sm:py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Quienes Somos
              </Link>
              <button 
                onClick={() => router.push('/')}
                className="relative p-2 text-gray-600 hover:text-indigo-600 focus:outline-none"
                aria-label="Carrito de compras"
              >
                <CartIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido del producto */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Imagen del producto */}
          <div className="space-y-4">
            <div className="relative">
              <Image
                src={selectedProduct.image || 'https://via.placeholder.com/280x176?text=Producto'}
                alt={selectedProduct.name}
                width={560}
                height={352}
                quality={95}
                priority={true}
                unoptimized
                className="w-full max-w-xs mx-auto h-auto rounded-lg shadow-lg object-cover transition-transform duration-300 hover:scale-105"
              />
              {selectedProduct.stock === 0 && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <span className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold">
                    AGOTADO
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h1>
              <p className="text-2xl font-bold text-indigo-600 mb-4">
                ${selectedProduct.price?.toLocaleString('es-CL') || 'Precio no disponible'}
              </p>
              
              {/* Badge de stock */}
              <div className="flex items-center space-x-2 mb-4">
                {selectedProduct.stock > 0 ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✓ Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    ✗ Agotado
                  </span>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-600 leading-relaxed">
                {selectedProduct.description || 'No hay descripción disponible para este producto.'}
              </p>
            </div>

            {/* Datos específicos del producto */}
            {selectedProduct.details && Object.keys(selectedProduct.details).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Información del Producto</h3>
                
                {/* Productos de alimentos (perros, gatos, mascotasPequeñas, todos) - Excluir arenas sanitarias */}
                {(!selectedProduct.name.toLowerCase().includes('arena')) && 
                 (selectedProduct.category === 'perros' || selectedProduct.category === 'gatos' || selectedProduct.category === 'mascotasPequeñas' || selectedProduct.category === 'todos') && (
                  <div className="space-y-4">
                    {/* Composición */}
                    {selectedProduct.details.composition && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v1z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-green-800 mb-2">Composición</h4>
                            <div className="bg-white/60 rounded-lg p-3">
                              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selectedProduct.details.composition}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Si no hay composition, mostrar todos los datos disponibles */}
                    {!selectedProduct.details.composition && Object.keys(selectedProduct.details).length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v1z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-green-800 mb-2">Composición</h4>
                            <div className="bg-white/60 rounded-lg p-3">
                              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selectedProduct.details.composition}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Análisis Garantizado */}
                    {selectedProduct.details.analysis && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-blue-800 mb-2">Análisis Garantizado</h4>
                            <div className="space-y-2">
                              {selectedProduct.details.analysis.map((item, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{item.label}:</span>
                                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Tabla de Ración Diaria */}
                    {selectedProduct.details.feedingGuideTable && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-purple-800 mb-2">Guía de Ración Diaria</h4>
                            <div className="bg-white/60 rounded-lg p-3">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    {selectedProduct.details.feedingGuideTable.columns.map((col, index) => (
                                      <th key={index} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedProduct.details.feedingGuideTable.rows.map((row, index) => (
                                    <tr key={index} className="border-b border-gray-100">
                                      {row.values.map((value, idx) => (
                                        <td key={idx} className="px-3 py-2 text-gray-900">
                                          {value}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Productos de accesorios */}
                {selectedProduct.category === 'accesorios' && selectedProduct.details.accessorySpecs && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v1z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-orange-800 mb-3">Especificaciones del Accesorio</h4>
                          <div className="space-y-3">
                            {selectedProduct.details.accessorySpecs.type && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Tipo</h5>
                                <p className="text-gray-900 text-sm">{selectedProduct.details.accessorySpecs.type}</p>
                              </div>
                            )}
                            {selectedProduct.details.accessorySpecs.dimensions && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Medidas</h5>
                                <p className="text-gray-900 text-sm">{selectedProduct.details.accessorySpecs.dimensions}</p>
                              </div>
                            )}
                            {selectedProduct.details.accessorySpecs.color && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Color</h5>
                                <p className="text-gray-900 text-sm">{selectedProduct.details.accessorySpecs.color}</p>
                              </div>
                            )}
                            {selectedProduct.details.accessorySpecs.material && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Material</h5>
                                <p className="text-gray-900 text-sm">{selectedProduct.details.accessorySpecs.material}</p>
                              </div>
                            )}
                            {selectedProduct.details.accessorySpecs.recommendedPet && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Mascota Recomendada</h5>
                                <p className="text-gray-900 text-sm">{selectedProduct.details.accessorySpecs.recommendedPet}</p>
                              </div>
                            )}
                            {selectedProduct.details.accessorySpecs.highlights && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Características Destacadas</h5>
                                <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-line">{selectedProduct.details.accessorySpecs.highlights}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Productos de farmacia */}
                {selectedProduct.category === 'farmacia' && selectedProduct.details.pharmacyInfo && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-purple-800 mb-3">Ficha del Medicamento</h4>
                          <div className="space-y-3">
                            {selectedProduct.details.pharmacyInfo.productType && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Tipo de Producto</h5>
                                <p className="text-gray-900 text-sm">{selectedProduct.details.pharmacyInfo.productType}</p>
                              </div>
                            )}
                            {selectedProduct.details.pharmacyInfo.indications && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Indicaciones</h5>
                                <p className="text-gray-900 text-sm leading-relaxed">{selectedProduct.details.pharmacyInfo.indications}</p>
                              </div>
                            )}
                            {selectedProduct.details.pharmacyInfo.usage && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Modo de Uso / Administración</h5>
                                <p className="text-gray-900 text-sm leading-relaxed">{selectedProduct.details.pharmacyInfo.usage}</p>
                              </div>
                            )}
                            {selectedProduct.details.pharmacyInfo.contraindications && (
                              <div className="bg-white/60 rounded-lg p-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Contraindicaciones</h5>
                                <p className="text-gray-900 text-sm leading-relaxed">{selectedProduct.details.pharmacyInfo.contraindications}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Datos genéricos para cualquier categoría */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Categoría</h3>
                    <p className="text-gray-900 font-medium">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Etapa</h3>
                    <p className="text-gray-900 font-medium">{selectedProduct.stage || 'General'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Si no hay datos específicos, mostrar información básica */}
            {(!selectedProduct.details || Object.keys(selectedProduct.details).length === 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Categoría</h3>
                  <p className="text-gray-900 font-medium">{selectedProduct.category}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Etapa</h3>
                  <p className="text-gray-900 font-medium">{selectedProduct.stage || 'General'}</p>
                </div>
              </div>
            )}

            
            {/* Botón de agregar al carrito */}
            <div className="space-y-4">
              <button
                onClick={handleAddToCart}
                disabled={selectedProduct.stock === 0 || isInCart(selectedProduct)}
                className={`w-full py-3 px-6 rounded-md font-semibold text-white transition-colors ${
                  selectedProduct.stock === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isInCart(selectedProduct)
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {selectedProduct.stock === 0
                  ? 'Producto agotado'
                  : isInCart(selectedProduct)
                  ? '✓ En el carrito'
                  : 'Agregar al carrito'}
              </button>

              {/* Botón de volver */}
              <Link
                href="/"
                className="block w-full py-3 px-6 text-center border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Volver al catálogo
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Botón flotante de WhatsApp */}
      <WhatsAppButton />
    </div>
  );
}
