'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

export default function TextScannerModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [streamError, setStreamError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [isRestartingCamera, setIsRestartingCamera] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = useCallback(async () => {
    setStreamError('');
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.error('No se pudo iniciar la cámara', error);
      setStreamError(
        'No pudimos acceder a tu cámara. Revisa los permisos del navegador.'
      );
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      stopStream();
    };
  }, [startCamera]);

  const preprocessFrame = (context, width, height) => {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const boosted = Math.min(255, gray * 1.35 + 15);
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
    context.putImageData(imageData, 0, 0);
  };

  const runOcr = async (dataUrl) => {
    try {
      const result = await Tesseract.recognize(dataUrl, 'spa+eng', {
        logger: () => {},
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÜáéíóúü0123456789%.,:-/()kgKGmº+- '
      });
      const text = result.data.text.trim();
      setRecognizedText(text);
      if (!text) {
        setStreamError('No encontramos texto claro. Acerca más la cámara o usa la opción de foto.');
      }
    } catch (error) {
      console.error('Error reconociendo texto', error);
      setStreamError('No pudimos leer el texto. Intenta mejorar la iluminación o enfocar mejor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    setStreamError('');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    preprocessFrame(context, canvas.width, canvas.height);
    await runOcr(canvas.toDataURL('image/png'));
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !canvasRef.current) return;
    setIsProcessing(true);
    setStreamError('');

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        preprocessFrame(context, canvas.width, canvas.height);
        await runOcr(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        setIsProcessing(false);
        setStreamError('No pudimos leer esa imagen. Intenta con otra foto.');
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setStreamError('No pudimos abrir la imagen seleccionada.');
    };
    reader.readAsDataURL(file);
  };

  const handleRestartCamera = async () => {
    setIsRestartingCamera(true);
    stopStream();
    await startCamera();
    setIsRestartingCamera(false);
  };

  const handleUseText = () => {
    if (recognizedText && onDetected) {
      onDetected(recognizedText);
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Escanear texto del saco</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              autoPlay
              playsInline
              muted
            />
          </div>

          {!cameraReady && !streamError && (
            <p className="text-sm text-gray-500">Iniciando cámara...</p>
          )}
          {streamError && (
            <p className="text-sm text-red-600">{streamError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCapture}
              disabled={isProcessing || !!streamError}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isProcessing ? 'Procesando…' : 'Capturar y leer texto'}
            </button>
            <button
              type="button"
              onClick={handleRestartCamera}
              disabled={isRestartingCamera || isProcessing}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-200"
            >
              {isRestartingCamera ? 'Reenfocando…' : 'Reintentar cámara'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-200"
            >
              Usar foto del dispositivo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>

          <textarea
            className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="El texto reconocido aparecerá aquí para que puedas editarlo antes de usarlo."
            value={recognizedText}
            onChange={(e) => setRecognizedText(e.target.value)}
          />

          <button
            type="button"
            onClick={handleUseText}
            disabled={!recognizedText.trim()}
            className="w-full inline-flex justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            Usar texto en el formulario
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
