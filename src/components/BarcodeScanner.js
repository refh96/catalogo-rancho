'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(true);
  const [restartCounter, setRestartCounter] = useState(0);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let controls;
    let hasResult = false;

    async function start() {
      try {
        controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err, ctrl) => {
            if (!hasResult && result) {
              hasResult = true;
              const text = result.getText();
              if (text) {
                onDetected(text);
              }
              try {
                ctrl.stop();
              } catch (e) {
                console.error('Error al detener el escaner', e);
              }
            }
          }
        );
      } catch (e) {
        console.error('Error inicializando el escaner', e);
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
        console.error('Error al detener el escaner en cleanup', e);
      }
      try {
        codeReader.reset();
      } catch (e) {
        console.error('Error al resetear el escaner', e);
      }
    };
  }, [onDetected, restartCounter]);

  const handleCloseClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleVideoClick = () => {
    setError(null);
    setIsStarting(true);
    setRestartCounter((prev) => prev + 1);
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
          onClick={handleVideoClick}
        />
      </div>
      {isStarting && !error && (
        <p className="text-sm text-gray-500">Iniciando camara...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {!error && !isStarting && (
        <p className="text-xs text-gray-500">
          Si la camara no enfoca bien, toca sobre el video para intentar reenfocar.
        </p>
      )}
      <button
        type="button"
        onClick={handleCloseClick}
        className="self-end px-3 py-2 text-xs sm:text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        Cerrar
      </button>
    </div>
  );
}
