'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Encuentrenos() {
  const [headerLogoFailed, setHeaderLogoFailed] = useState(false);
  const [heroLogoFailed, setHeroLogoFailed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {!headerLogoFailed ? (
                <Image
                  src="https://i.ibb.co/twMHRJmQ/503853895-17910857019133345-7677598013054732096-n.jpg"
                  alt="Logo Rancho de Mascotas Hualpén"
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 object-cover"
                  onError={() => setHeaderLogoFailed(true)}
                />
              ) : (
                <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-full border-2 border-indigo-600 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">RM</span>
                </div>
              )}
              <Link href="/" className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Rancho Mascotas Hualpén
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-indigo-600 transition-colors">
                Inicio
              </Link>
              <Link href="/encuentrenos" className="text-indigo-600 font-medium">
                Encuéntrenos
              </Link>
            </nav>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Volver
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Logo del Local */}
        <div className="text-center mb-12">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              {!heroLogoFailed ? (
                <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                  <Image
                    src="https://i.ibb.co/twMHRJmQ/503853895-17910857019133345-7677598013054732096-n.jpg"
                    alt="Logo Rancho de Mascotas Hualpén"
                    fill
                    unoptimized
                    className="rounded-full shadow-2xl border-4 border-white object-cover"
                    onError={() => setHeroLogoFailed(true)}
                  />
                </div>
              ) : (
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full shadow-2xl border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-4xl sm:text-5xl font-bold">RM</span>
                </div>
              )}
            </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Encuéntrenos
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Visítanos en nuestro local y descubre todo lo que tenemos para ti y tu mascota
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Información de Ubicación */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Ubicación
              </h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  <span className="font-semibold">Dirección:</span><br />
                  Av. La Reconquista 4016<br />
                  Hualpén, Chile
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Referencia:</span><br />
                  Frente a la Feria libre de Hualpén
                </p>
                <div className="pt-4">
                  <a 
                    href="https://www.google.com/maps/dir/?api=1&destination=Av+La+Reconquista+4016+Hualp%C3%A9n+Chile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                    </svg>
                    Cómo llegar
                  </a>
                </div>
              </div>
            </div>

            {/* Horarios de Atención */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Horarios de Atención
              </h2>
              <div className="space-y-4">
                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="font-semibold text-gray-900">Lunes a Viernes</p>
                  <p className="text-gray-700">10:00 AM - 9:00 PM</p>
                </div>
                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="font-semibold text-gray-900">Sábados y Domingos</p>
                  <p className="text-gray-700">10:00 AM - 8:00 PM</p>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Importante:</strong> Nuestro horario puede variar durante festivos. 
                    Te recomendamos llamar antes de visitarnos.
                  </p>
                </div>
              </div>
            </div>

            {/* Reparto a Domicilio */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
                </svg>
                Reparto a Domicilio
              </h2>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="font-semibold text-gray-900">🏠 Hualpén</p>
                  <p className="text-gray-700">
                    <span className="text-green-600 font-semibold">GRATIS</span> en compras sobre $15.000
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Lunes a Sábados</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-semibold text-gray-900">🌆 Talcahuano y Concepción</p>
                  <p className="text-gray-700">
                    Recargo de <span className="text-blue-600 font-semibold">$2.000</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Lunes a Sábados</p>
                </div>
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-sm text-indigo-800">
                    <strong>Nota:</strong> Realizamos 2 repartos diarios. Mañana: 12:30 AM a 3:00 PM. Tarde: 7:00 PM a 9:00 PM.
                  </p>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                Contacto
              </h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  <span className="font-semibold">Teléfono:</span><br />
                  +56 9 2370 8742
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">WhatsApp:</span><br />
                  <a 
                    href="https://wa.me/56923708742" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    +56 9 2370 8742
                  </a>
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Email:</span><br />
                  ranchomascotas.ccp@gmail.com
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Instagram:</span><br />
                  @rancho.mascotas.hualpen
                </p>
                <div className="pt-4 space-y-2">
                  <a 
                    href="mailto:ranchomascotas.ccp@gmail.com"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Enviar email
                  </a>
                  <a 
                    href="https://www.instagram.com/rancho.mascotas.hualpen/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 w-full justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                    </svg>
                    Seguir en Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa de Google Maps */}
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mapa</h2>
            <div className="aspect-w-16 aspect-h-12">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.8476548765!2d-73.0987654!3d-36.9123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9669c3e4b5c6d7e8%3A0x8f9e7d6c5b4a3210!2sAv.%20La%20Reconquista%204016%2C%20Hualp%C3%A9n%2C%20Chile!5e0!3m2!1ses!2scl!4v1234567890"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
                title="Mapa de ubicación - Rancho de Mascotas Hualpén"
              ></iframe>
            </div>
            
            {/* Imagen del local */}
            <div className="mt-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">📹 Conoce nuestro local</h3>
                <div className="max-w-2xl mx-auto">
                  <div className="relative w-full h-64 sm:h-80 md:h-96">
                    <Image 
                      src="https://i.ibb.co/XH7nD58/rancho.jpg"
                      alt="Rancho de Mascotas Hualpén - Nuestro local"
                      fill
                      unoptimized
                      className="rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 object-cover"
                      onError={(event) => {
                        const target = event.currentTarget;
                        target.onerror = null;
                        target.src = 'https://via.placeholder.com/800x450?text=Rancho+Mascotas+Hualp%C3%A9n';
                      }}
                    />
                  </div>
                  <p className="text-center text-gray-600 text-sm mt-4">
                    <a href="https://www.instagram.com/rancho.mascotas.hualpen/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 font-medium">
                      @rancho.mascotas.hualpen
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="mt-12 bg-indigo-50 rounded-lg p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">¿Por qué visitarnos?</h3>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Amor por las mascotas</h4>
                <p className="text-gray-600 text-sm">Tratamos a cada mascota como si fuera nuestra</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Productos de calidad</h4>
                <p className="text-gray-600 text-sm">Seleccionamos los mejores productos para tus mascotas</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Atención personalizada</h4>
                <p className="text-gray-600 text-sm">Te asesoramos para encontrar lo mejor para tu compañero</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Rancho Mascotas Hualpén. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
