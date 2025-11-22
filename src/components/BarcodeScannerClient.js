'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls;

    async function start() {
      if (!videoRef.current) return;
      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err, ctrl) => {
            if (result) {
              const text = result.getText();
              if (text) {
                console.log('Código de barras detectado:', text);
                if (onDetected) {
                  onDetected(text);
                }
              }
              if (ctrl) {
                try {
                  ctrl.stop();
                } catch (e) {
                  console.error('Error stopping barcode scanner', e);
                }
              }
            }
          }
        );
      } catch (e) {
        console.error('Error starting barcode scanner', e);
        setError('No se pudo acceder a la camara. Revisa los permisos del navegador.');
      } finally {
        setIsStarting(false);
      }
    }

    start();

    return () => {
      try {
        if (controls) {
          controls.stop();
        }
      } catch (e) {
        console.error('Error stopping barcode scanner on cleanup', e);
      }
    };
  }, [onDetected]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="w-full rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          autoPlay
          muted
          playsInline
        />
      </div>
      {isStarting && !error && (
        <p className="text-sm text-gray-500">Iniciando camara...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="button"
        onClick={handleClose}
        className="self-end px-3 py-2 text-xs sm:text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        Cerrar
      </button>
    </div>
  );
}
