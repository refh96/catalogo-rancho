'use client';
import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

// Funciones de fecha
const formatDateKey = (date) => {
  return date.toISOString().split('T')[0];
};

const formatDeliveryDayForMessage = (dateKey) => {
  const date = new Date(dateKey + 'T00:00:00');
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  return date.toLocaleDateString('es-CL', options);
};

const formatDeliveryDayOptionLabel = (date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Mañana';
  } else {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString('es-CL', options);
  }
};

const getAvailableDeliveryDays = () => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Omitir domingo
    if (date.getDay() !== 0) {
      days.push(date);
    }
  }
  
  return days;
};

const getInitialDeliveryOptions = () => {
  const availableDays = getAvailableDeliveryDays();
  return {
    deliveryDay: formatDateKey(availableDays[0]),
    deliveryTimeSlot: 'morning'
  };
};

const getTimeSlotText = (slot) => {
  switch(slot) {
    case 'morning': return '12:30 - 14:30';
    case 'afternoon': return '19:00 - 21:00';
    default: return '';
  }
};

// Funciones de validación
const validatePhone = (phone) => {
  // Permitir solo números, +, -, (), y espacios
  const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 8;
};

const validateAddress = (address) => {
  // Verificar que haya al menos un número y longitud mínima de 5 caracteres
  return /\d/.test(address) && address.trim().length >= 5;
};

const formatPhone = (value) => {
  // Mantener el + al inicio si existe
  const hasPlus = value.startsWith('+');
  const cleaned = value.replace(/\D/g, '');
  
  if (hasPlus && cleaned.length > 0) {
    // Formato con código de país
    if (cleaned.length <= 2) return `+${cleaned}`;
    if (cleaned.length <= 6) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 9) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6, 10)}`;
  } else {
    // Formato local sin +
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  }
};

const BANK_TRANSFER_DETAILS = {
  holder: 'Nicolás Herrera Márquez',
  bank: 'Banco de Chile',
  rut: '19.934.017-0',
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
  const [validationErrors, setValidationErrors] = useState({});

  const [orderDetailsState, setOrderDetailsState] = useState(() => {
    const initialDelivery = getInitialDeliveryOptions();
    return {
      name: '',
      phone: '',
      address: '',
      notes: '',
      orderType: 'delivery',
      paymentMethod: 'efectivo',
      comuna: '',
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
    const productsText = cart.map(item => 
      `- ${item.quantity}x ${item.name} - $${item.price.toLocaleString('es-CL')} c/u`
    ).join('%0A');
    
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
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
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

  React.useEffect(() => {
    if (isOpen && cart.length > 0) {
      setShowStockAlert(true);
    }
  }, [isOpen, cart.length]);

  // Función para validar y mostrar errores
  const handleInputChange = (field, value) => {
    let error = '';
    
    if (field === 'phone') {
      // Actualizar directamente sin formateo automático
      setOrderDetailsState({...orderDetailsState, phone: value});
      
      if (value && !validatePhone(value)) {
        error = 'Ingresa un teléfono válido (mínimo 8 dígitos)';
      }
    } else if (field === 'address') {
      setOrderDetailsState({...orderDetailsState, address: value});
      
      if (value && !validateAddress(value)) {
        error = 'La dirección debe incluir al menos un número (mínimo 5 caracteres)';
      }
    } else {
      setOrderDetailsState({...orderDetailsState, [field]: value});
    }
    
    setValidationErrors({...validationErrors, [field]: error});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones antes de enviar
    const errors = {};
    
    if (!validatePhone(orderDetailsState.phone)) {
      errors.phone = 'Ingresa un teléfono válido (mínimo 8 dígitos)';
    }
    
    if (orderType === 'delivery' && !validateAddress(orderDetailsState.address)) {
      errors.address = 'La dirección debe incluir al menos un número (mínimo 5 caracteres)';
    }
    
    if (orderType === 'delivery' && !orderDetailsState.comuna) {
      errors.comuna = 'Por favor selecciona una comuna para el envío';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const orderData = {
      ...orderDetailsState,
      orderType
    };
    
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
                      <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-white border border-gray-200 relative" style={{ position: 'relative' }}>
                        <img 
                          src={item.image || 'https://via.placeholder.com/80?text=Sin+imagen'} 
                          alt={item.name} 
                          className="w-full h-full object-contain p-1"
                          loading="lazy"
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
                        type="text"
                        required
                        value={orderDetailsState.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
                          validationErrors.phone ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        placeholder="Ingresa tu número de teléfono (+56 9 1234 5678)"
                        inputMode="tel"
                      />
                      {validationErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                      )}
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
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className={`w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-2 ${
                            validationErrors.address ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                          placeholder="Ingresa tu dirección completa"
                        />
                        {validationErrors.address && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>
                        )}
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
                        <option value="tarjeta">Tarjeta de crédito/débito</option>
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
                          <div className="flex items-start space-x-2">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas adicionales (opcional)
                      </label>
                      <textarea
                        value={orderDetailsState.notes}
                        onChange={(e) => setOrderDetailsState({...orderDetailsState, notes: e.target.value})}
                        className="w-full p-2 border rounded text-black bg-white border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        rows={3}
                        placeholder="Alguna instrucción especial para tu pedido..."
                      />
                    </div>
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
                    <div className="flex space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setIsCheckingOut(false)}
                        className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Volver al carrito
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Enviar pedido por WhatsApp
                      </button>
                    </div>
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
