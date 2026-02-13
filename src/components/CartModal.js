// src/components/CartModal.js
'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useCart } from '../contexts/CartContext';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDeliveryOptions = () => {
  const now = new Date();
  let deliveryDate = new Date(now);
  const dayOfWeek = deliveryDate.getDay();
  if (dayOfWeek === 0) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }
  const isBeforeMiddaySlot = now.getHours() < 12 || (now.getHours() === 12 && now.getMinutes() < 30);
  const deliveryTimeSlot = isBeforeMiddaySlot ? 'morning' : 'afternoon';
  return {
    deliveryDay: formatDateKey(deliveryDate),
    deliveryTimeSlot,
  };
};

const getAvailableDeliveryDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    if (date.getDay() === 0) {
      continue;
    }
    days.push(date);
  }
  return days;
};

const formatDeliveryDayOptionLabel = (date) => {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const formatter = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  const formatted = formatter.format(date);
  if (isToday) {
    return `Hoy - ${formatted}`;
  }
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatDeliveryDayForMessage = (deliveryDay) => {
  if (!deliveryDay) return '';
  const [year, month, day] = deliveryDay.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getTimeSlotText = (slot) => {
  if (slot === 'morning') {
    return 'Mañana (12:30 - 14:30)';
  }
  if (slot === 'afternoon') {
    return 'Tarde (19:00 - 21:00)';
  }
  return '';
};

const BANK_TRANSFER_DETAILS = {
  holder: 'MINIMARKET NELSON HERRERA MUNOZ EIRL',
  bank: 'Banco Estado',
  rut: '76.880.605-5',
  accountType: 'Chequera electrónica / Cuenta vista',
  accountNumber: '53570083968',
  email: 'ndherreram@gmail.com'
};

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
  const [showStockAlert, setShowStockAlert] = useState(false);

  const [orderDetailsState, setOrderDetailsState] = useState(() => {
    const initialDelivery = getInitialDeliveryOptions();
    return {
      name: '',
      phone: '',
      address: '',
      notes: '',
      orderType: 'delivery',
      paymentMethod: 'efectivo', // Valor por defecto para evitar que el usuario no seleccione nada
      comuna: '', // Nueva propiedad para almacenar la comuna seleccionada
      deliveryDay: initialDelivery.deliveryDay,
      deliveryTimeSlot: initialDelivery.deliveryTimeSlot,
    };
  });

  const now = new Date();
  const todayKey = formatDateKey(now);
  const isAfterOnePM =
    now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() > 0);
  const isAfterSevenThirtyPM =
    now.getHours() > 19 || (now.getHours() === 19 && now.getMinutes() > 30);
  const isTodaySelected = orderDetailsState.deliveryDay === todayKey;
  const isMorningSlotDisabled = isTodaySelected && isAfterOnePM;
  const isAfternoonSlotDisabled = isTodaySelected && isAfterSevenThirtyPM;

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
    const deliveryDayText = order.orderType === 'delivery' && order.deliveryDay
      ? `%0A*Día de entrega:* ${formatDeliveryDayForMessage(order.deliveryDay)}`
      : '';
    const deliveryTimeSlotText = order.orderType === 'delivery' && order.deliveryTimeSlot
      ? `%0A*Horario de entrega:* ${getTimeSlotText(order.deliveryTimeSlot)}`
      : '';
    const paymentMethodText = order.paymentMethod ? `%0A*Método de pago:* ${getPaymentMethodText(order.paymentMethod)}` : '';
    const transferDetailsText = order.paymentMethod === 'transferencia'
      ? `%0A*Datos para transferencia:*%0A${BANK_TRANSFER_DETAILS.holder}%0A${BANK_TRANSFER_DETAILS.bank}%0A${BANK_TRANSFER_DETAILS.rut}%0A${BANK_TRANSFER_DETAILS.accountType}%0A${BANK_TRANSFER_DETAILS.accountNumber}%0A${BANK_TRANSFER_DETAILS.email}`
      : '';
    const transferReminderText = order.paymentMethod === 'transferencia'
      ? `%0A*Recuerda:* Envía tu comprobante de transferencia por WhatsApp para confirmar tu pedido.`
      : '';
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
                   `*Tipo de pedido:* ${orderTypeText}` +
                   `${deliveryDayText}${deliveryTimeSlotText}` +
                   `${nameText}${phoneText}${addressText}%0A%0A` +
                   `*Productos:*%0A${productsText}%0A%0A` +
                   `${paymentMethodText}${transferDetailsText}${transferReminderText}` +
                   `${notesText}%0A` +
                   `*Subtotal:* $${subtotal.toLocaleString('es-CL')}%0A` +
                   `${order.orderType === 'delivery' ? shippingMessage : ''}` +
                   `*Total:* $${total.toLocaleString('es-CL')}%0A%0A`;
    
    // Abrir WhatsApp Web con el mensaje prellenado
    window.open(`https://wa.me/56923708742?text=${message}`, '_blank');
  };

  const getPaymentMethodText = (method) => {
    switch(method) {
      case 'efectivo': return 'Efectivo al recibir';
      case 'transferencia': return 'Transferencia bancaria';
      case 'tarjeta': return 'Tarjeta de crédito/débito';
      default: return 'No especificado';
    }
  };

  // Mensaje de stock visible al abrir el carrito
  React.useEffect(() => {
    if (isOpen && cart.length > 0) {
      console.log('Mostrando mensaje de stock al abrir carrito');
      setShowStockAlert(true);
    }
  }, [isOpen, cart.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validar que se haya seleccionado una comuna si es envío
    if (orderType === 'delivery' && !orderDetailsState.comuna) {
      alert('Por favor seleccione una comuna para el envío');
      return;
    }
    const submitNow = new Date();
    const submitTodayKey = formatDateKey(submitNow);
    const isAfterOnePMAtSubmit =
      submitNow.getHours() > 13 || (submitNow.getHours() === 13 && submitNow.getMinutes() > 0);
    const isTodaySelectedAtSubmit = orderDetailsState.deliveryDay === submitTodayKey;
    const isMorningSlotDisabledAtSubmit = isTodaySelectedAtSubmit && isAfterOnePMAtSubmit;
    const isAfterSevenThirtyPMAtSubmit =
      submitNow.getHours() > 19 || (submitNow.getHours() === 19 && submitNow.getMinutes() > 30);
    const isAfternoonSlotDisabledAtSubmit = isTodaySelectedAtSubmit && isAfterSevenThirtyPMAtSubmit;

    if (
      orderType === 'delivery' &&
      isMorningSlotDisabledAtSubmit &&
      orderDetailsState.deliveryTimeSlot === 'morning'
    ) {
      alert(
        'El horario de mañana (12:30 - 14:30) ya no está disponible para hoy. Por favor selecciona el horario de la tarde o cambia el día de entrega.'
      );
      return;
    }
    if (
      orderType === 'delivery' &&
      isAfternoonSlotDisabledAtSubmit &&
      orderDetailsState.deliveryTimeSlot === 'afternoon'
    ) {
      alert(
        'El horario de tarde (19:00 - 21:00) ya no está disponible para hoy. Por favor selecciona un día de entrega siguiente.'
      );
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

        {/* Mensaje de confirmación de stock */}
        {showStockAlert && (
          <div className="bg-amber-50 border border-amber-200 p-3 mx-4 mt-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-medium">
                  IMPORTANTE: Tu pedido está sujeto a confirmación de stock por parte del local.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Te contactaremos a la brevedad para confirmar la disponibilidad de los productos y coordinar la entrega.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tu carrito está vacío</p>
          ) : !isCheckingOut ? (
            <>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border-b">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-white border border-gray-200 relative">
                        <Image 
                          src={item.image || 'https://via.placeholder.com/80?text=Sin+imagen'} 
                          alt={item.name} 
                          fill
                          unoptimized
                          className="object-contain p-1"
                          sizes="80px"
                          onError={(event) => {
                            const target = event.currentTarget;
                            target.onerror = null;
                            target.src = 'https://via.placeholder.com/80?text=Sin+imagen';
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
                        className="text-red-500 hover:text-red-700 transition-colors p-1 ml-2"
                        aria-label="Eliminar producto"
                      >
                        <TrashIcon className="h-4 w-4" />
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
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Día de entrega:</p>
                          <p className="text-sm font-medium text-gray-700 mb-1">(Lunes a Sábado)</p>
                          <select
                            required
                            value={orderDetailsState.deliveryDay}
                            onChange={(e) => setOrderDetailsState({...orderDetailsState, deliveryDay: e.target.value})}
                            className="w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          >
                            {getAvailableDeliveryDays().map((date) => {
                              const value = formatDateKey(date);
                              return (
                                <option key={value} value={value}>
                                  {formatDeliveryDayOptionLabel(date)}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Horario de entrega:</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isMorningSlotDisabled) return;
                                setOrderDetailsState({
                                  ...orderDetailsState,
                                  deliveryTimeSlot: 'morning',
                                });
                              }}
                              disabled={isMorningSlotDisabled}
                              className={`px-3 py-1 text-sm border rounded font-medium ${
                                isMorningSlotDisabled
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                  : orderDetailsState.deliveryTimeSlot === 'morning'
                                  ? 'bg-amber-100 border-amber-500 text-black'
                                  : 'bg-white border-gray-300 text-black hover:bg-gray-50'
                              }`}
                            >
                              Mañana (12:30 - 14:30)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isAfternoonSlotDisabled) return;
                                setOrderDetailsState({
                                  ...orderDetailsState,
                                  deliveryTimeSlot: 'afternoon',
                                });
                              }}
                              disabled={isAfternoonSlotDisabled}
                              className={`px-3 py-1 text-sm border rounded font-medium ${
                                isAfternoonSlotDisabled
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                  : orderDetailsState.deliveryTimeSlot === 'afternoon'
                                  ? 'bg-amber-100 border-amber-500 text-black'
                                  : 'bg-white border-gray-300 text-black hover:bg-gray-50'
                              }`}
                            >
                              Tarde (19:00 - 21:00)
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
                      {orderDetailsState.paymentMethod === 'transferencia' && (
                        <div className="mt-3 p-3 border border-amber-400 bg-amber-50 rounded-lg text-xs text-gray-700 space-y-2">
                          <div>
                            <p className="font-semibold text-amber-800 uppercase tracking-wide text-[11px]">Datos para transferencia</p>
                            <p>{BANK_TRANSFER_DETAILS.holder}</p>
                            <p>{BANK_TRANSFER_DETAILS.bank}</p>
                            <p>{BANK_TRANSFER_DETAILS.rut}</p>
                            <p>{BANK_TRANSFER_DETAILS.accountType}</p>
                            <p>{BANK_TRANSFER_DETAILS.accountNumber}</p>
                            <p>{BANK_TRANSFER_DETAILS.email}</p>
                          </div>
                          <div className="flex items-start space-x-2 text-amber-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-[2px]" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 112 0v5a1 1 0 11-2 0V9zm1-4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                            </svg>
                            <p>
                              Recuerda enviar tu comprobante de transferencia por WhatsApp para confirmar tu pedido.
                            </p>
                          </div>
                        </div>
                      )}
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