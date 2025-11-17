// src/components/CartModal.js
'use client';
import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function CartModal({ isOpen, onClose }) {
  const {
    cart,
    orderType,
    setOrderType,
    orderDetails,
    setOrderDetails,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [orderDetailsState, setOrderDetailsState] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    orderType: 'delivery',
    paymentMethod: 'efectivo', // Valor por defecto para evitar que el usuario no seleccione nada
    comuna: '' // Nueva propiedad para almacenar la comuna seleccionada
  });

  const sendWhatsAppMessage = (order) => {
    // Formatear los productos del carrito
    const productsText = cart.map(item => 
      `- ${item.quantity}x ${item.name} - $${item.price.toLocaleString('es-CL')} c/u`
    ).join('%0A');
    
    // Formatear los detalles del pedido
    const orderTypeText = order.orderType === 'delivery' ? 'Envío a domicilio' : 'Retiro en tienda';
    const comunaText = order.comuna ? ` (${order.comuna.charAt(0).toUpperCase() + order.comuna.slice(1)})` : '';
    const addressText = order.orderType === 'delivery' 
      ? `%0A*Dirección:* ${order.address || 'No especificada'}${comunaText}` 
      : '';
    const paymentMethodText = order.paymentMethod ? `%0A*Método de pago:* ${getPaymentMethodText(order.paymentMethod)}` : '';
    const notesText = order.notes ? `%0A*Notas:* ${order.notes}` : '';
    const nameText = order.name ? `%0A*Nombre:* ${order.name}` : '';
    const phoneText = order.phone ? `%0A*Teléfono:* ${order.phone}` : '';
    
    // Calcular subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calcular costo de envío
    let shippingCost = 0;
    let shippingMessage = '';

    if (order.orderType === 'delivery' && order.comuna) {
      if (order.comuna === 'hualpen') {
        if (subtotal >= 15000) {
          shippingMessage = '*¡Envío gratis por compra sobre $15.000 en Hualpén!*%0A';
        } else {
          shippingCost = 1000;
          shippingMessage = '*Costo de envío (Hualpén):* $1.000%0A';
        }
      } else {
        shippingCost = 2000;
        shippingMessage = `*Costo de envío (${order.comuna.charAt(0).toUpperCase() + order.comuna.slice(1)}):* $2.000%0A`;
      }
    }
    
    const total = subtotal + shippingCost;
    
    // Crear mensaje
    const message = `*Nuevo Pedido de Rancho Mascotas Hualpén*%0A%0A` +
                   `*Productos:*%0A${productsText}%0A%0A` +
                   `*Tipo de pedido:* ${orderTypeText}${addressText}` +
                   `${nameText}${phoneText}${paymentMethodText}${notesText}%0A%0A` +
                   `*Subtotal:* $${subtotal.toLocaleString('es-CL')}%0A` +
                   `${orderType === 'delivery' ? shippingMessage : ''}` +
                   `*Total:* $${total.toLocaleString('es-CL')}%0A%0A`;
    
    // Abrir WhatsApp Web con el mensaje prellenado
    window.open(`https://wa.me/56958994306?text=${message}`, '_blank');
  };

  const getPaymentMethodText = (method) => {
    switch(method) {
      case 'efectivo': return 'Efectivo al recibir';
      case 'transferencia': return 'Transferencia bancaria';
      case 'tarjeta': return 'Tarjeta de crédito/débito';
      default: return 'No especificado';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validar que se haya seleccionado una comuna si es envío
    if (orderType === 'delivery' && !orderDetailsState.comuna) {
      alert('Por favor seleccione una comuna para el envío');
      return;
    }
    // Combinar los detalles del pedido con el tipo de pedido actual
    const orderData = {
      ...orderDetailsState,
      orderType
    };
    // Enviar pedido a través de WhatsApp
    sendWhatsAppMessage(orderData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Carrito de Compras</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tu carrito está vacío</p>
          ) : !isCheckingOut ? (
            <>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border-b">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-white border border-gray-200">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/80?text=Sin+imagen';
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-gray-600">${item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-black font-medium hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span>{item.quantity || 1}</span>
                      <button
                        onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-black font-medium hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 ml-2"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-between text-lg font-bold text-black">
                  <span className="text-black">Total:</span>
                  <span className="text-black">${subtotal.toLocaleString()}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="text-sm text-gray-600 text-center mt-2">
                    * Envío gratis en Hualpén para pedidos sobre $15.000
                  </div>
                )}
                <button
                  onClick={() => setIsCheckingOut(true)}
                  className="w-full mt-4 bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Proceder a agendar
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-medium">Tipo de entrega</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`p-4 border rounded-lg ${
                    orderType === 'delivery' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                  }`}
                >
                  <h4 className="font-medium">Envío a domicilio</h4>
                  <p className="text-sm text-gray-500">Recibe tu pedido en la puerta de tu casa</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('pickup')}
                  className={`p-4 border rounded-lg ${
                    orderType === 'pickup' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                  }`}
                >
                  <h4 className="font-medium">Retiro en tienda</h4>
                  <p className="text-sm text-gray-500">Retira tu pedido en nuestro local</p>
                </button>
              </div>

              {orderType && (
                <>
                  <h3 className="text-lg font-medium">Datos de contacto</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        required
                        value={orderDetailsState.name}
                        onChange={(e) => setOrderDetailsState({...orderDetailsState, name: e.target.value})}
                        className="w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        placeholder="Ingresa tu nombre completo"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        required
                        value={orderDetailsState.phone}
                        onChange={(e) => setOrderDetailsState({...orderDetailsState, phone: e.target.value})}
                        className="w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        placeholder="Ingresa tu número de teléfono"
                      />
                    </div>

                    {orderType === 'delivery' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección de envío
                        </label>
                        <input
                          type="text"
                          required
                          value={orderDetailsState.address}
                          onChange={(e) => setOrderDetailsState({...orderDetailsState, address: e.target.value})}
                          className="w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-2"
                          placeholder="Ingresa tu dirección completa"
                        />
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Comuna:</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setOrderDetailsState({...orderDetailsState, comuna: 'hualpen'})}
                              className={`px-3 py-1 text-sm border rounded font-medium ${
                                orderDetailsState.comuna === 'hualpen' ? 'bg-amber-100 border-amber-500 text-black' : 'bg-white border-gray-300 text-black hover:bg-gray-50'
                              }`}
                            >
                              Hualpén
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderDetailsState({...orderDetailsState, comuna: 'concepcion'})}
                              className={`px-3 py-1 text-sm border rounded font-medium ${
                                orderDetailsState.comuna === 'concepcion' ? 'bg-amber-100 border-amber-500 text-black' : 'bg-white border-gray-300 text-black hover:bg-gray-50'
                              }`}
                            >
                              Concepción
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderDetailsState({...orderDetailsState, comuna: 'talcahuano'})}
                              className={`px-3 py-1 text-sm border rounded font-medium ${
                                orderDetailsState.comuna === 'talcahuano' ? 'bg-amber-100 border-amber-500 text-black' : 'bg-white border-gray-300 text-black hover:bg-gray-50'
                              }`}
                            >
                              Talcahuano
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Método de pago
                      </label>
                      <select
                        required
                        value={orderDetailsState.paymentMethod}
                        onChange={(e) => setOrderDetailsState({...orderDetailsState, paymentMethod: e.target.value})}
                        className="w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Selecciona un método de pago</option>
                        <option value="efectivo">Efectivo al recibir</option>
                        <option value="transferencia">Transferencia bancaria</option>
                        {orderType === 'delivery' && <option value="tarjeta">Tarjeta de crédito/débito</option>}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="px-4 py-2 border rounded-lg text-black font-medium hover:bg-gray-100 border-gray-300"
                    >
                      Volver al carrito
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                      Confirmar pedido
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}