'use client';
import { useState } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const BackupManager = () => {
  const { products, loading } = useProducts();
  const { user } = useAuth();
  const [backupStatus, setBackupStatus] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestorePasswordModal, setShowRestorePasswordModal] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restorePasswordError, setRestorePasswordError] = useState('');
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);

  // Contraseña especial para restaurar backup
  const RESTORE_PASSWORD = 'RanchoRestore2024!';

  // Solo el administrador puede acceder
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Función para crear backup
  const createBackup = async () => {
    try {
      setIsProcessing(true);
      setBackupStatus('Creando backup...');

      // Obtener productos directamente del estado del contexto (ya organizados por categorías)
      const allProducts = [];
      const categoryCount = {};
      
      // Recorrer todas las categorías y contar productos
      Object.entries(products).forEach(([category, categoryProducts]) => {
        categoryCount[category] = categoryProducts.length;
        console.log(`Categoría ${category}: ${categoryProducts.length} productos`);
        
        categoryProducts.forEach(product => {
          allProducts.push({
            id: product.id,
            category: category,
            ...product
          });
        });
      });

      // También obtener directamente de Firestore para comparar
      const productsCollection = collection(db, 'products');
      const querySnapshot = await getDocs(productsCollection);
      const firestoreProducts = [];
      
      querySnapshot.forEach((doc) => {
        firestoreProducts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Productos desde contexto: ${allProducts.length}`);
      console.log(`Productos desde Firestore: ${firestoreProducts.length}`);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.1',
        metadata: {
          totalProducts: allProducts.length,
          categoryCount: categoryCount,
          firestoreProductCount: firestoreProducts.length
        },
        products: allProducts,
        // Incluir también los datos crudos de Firestore como respaldo
        rawFirestoreData: firestoreProducts
      };

      // Crear el archivo JSON
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Crear URL y descargar
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rancho-mascotas-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus(`Backup creado exitosamente con ${allProducts.length} productos (Contexto) / ${firestoreProducts.length} (Firestore)`);
      
      // Guardar en localStorage dividiendo en partes si es necesario
      try {
        const estimatedSize = new Blob([dataStr]).size;
        const sizeInMB = estimatedSize / (1024 * 1024);
        const maxChunkSize = 4 * 1024 * 1024; // 4MB máximo por chunk
        
        if (sizeInMB < 4) {
          // Backup pequeño: guardar normalmente
          localStorage.setItem('ranchoMascotasBackup', dataStr);
          localStorage.setItem('ranchoMascotasBackupDate', new Date().toISOString());
          localStorage.setItem('ranchoMascotasBackupChunks', '1');
          console.log(`Backup guardado en localStorage (${sizeInMB.toFixed(2)} MB)`);
        } else {
          // Backup grande: dividir en chunks
          const chunks = [];
          let chunkIndex = 0;
          
          for (let i = 0; i < dataStr.length; i += maxChunkSize) {
            const chunk = dataStr.slice(i, i + maxChunkSize);
            chunks.push(chunk);
            localStorage.setItem(`ranchoMascotasBackup_chunk_${chunkIndex}`, chunk);
            chunkIndex++;
          }
          
          // Guardar metadata
          localStorage.setItem('ranchoMascotasBackupDate', new Date().toISOString());
          localStorage.setItem('ranchoMascotasBackupChunks', chunks.length.toString());
          localStorage.setItem('ranchoMascotasBackupSize', estimatedSize.toString());
          
          console.log(`Backup dividido en ${chunks.length} chunks (${sizeInMB.toFixed(2)} MB total)`);
        }
      } catch (storageError) {
        console.warn('No se pudo guardar en localStorage:', storageError.message);
      }
      
    } catch (error) {
      console.error('Error creando backup:', error);
      setBackupStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para restaurar backup
  const restoreBackup = async (file) => {
    try {
      setIsProcessing(true);
      setRestoreStatus('Restaurando backup...');

      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validar formato del backup
      if (!backupData.products && !backupData.rawFirestoreData) {
        throw new Error('Formato de backup inválido');
      }

      // Usar los productos del array principal, o si no existe, usar los datos crudos
      const productsToRestore = backupData.products || backupData.rawFirestoreData;
      
      // Eliminar duplicados basados en ID
      const uniqueProducts = productsToRestore.filter((product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
      );

      console.log(`Productos a restaurar (únicos): ${uniqueProducts.length}`);
      console.log(`Productos originales: ${productsToRestore.length}`);

      // Confirmar restauración
      const confirmRestore = window.confirm(
        `¿Estás seguro de restaurar el backup?\n\n` +
        `Se restaurarán ${uniqueProducts.length} productos únicos\n` +
        `Los datos actuales se perderán\n` +
        `Fecha del backup: ${new Date(backupData.timestamp).toLocaleString('es-CL')}\n` +
        `Versión del backup: ${backupData.version || '1.0'}\n\n` +
        `Esta acción no se puede deshacer.`
      );

      if (!confirmRestore) {
        setRestoreStatus('Restauración cancelada');
        return;
      }

      // Eliminar todos los productos actuales
      const productsCollection = collection(db, 'products');
      const currentProducts = await getDocs(productsCollection);
      
      for (const docSnapshot of currentProducts.docs) {
        await deleteDoc(doc(db, 'products', docSnapshot.id));
      }

      // Restaurar productos únicos
      let restoredCount = 0;
      for (const product of uniqueProducts) {
        const { id, category, ...productData } = product;
        
        // Asegurarse de que la categoría esté incluida
        const finalProductData = {
          ...productData,
          category: category || productData.category,
          restoredAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'products', id), finalProductData);
        restoredCount++;
      }

      setRestoreStatus(`Backup restaurado exitosamente. ${restoredCount} productos recuperados.`);
      
      // Recargar la página para actualizar los datos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error restaurando backup:', error);
      setRestoreStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para manejar archivo seleccionado
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/json') {
        setRestoreStatus('Por favor selecciona un archivo JSON válido');
        return;
      }
      // Guardar el archivo y mostrar modal de contraseña
      setPendingRestoreFile(file);
      setShowRestorePasswordModal(true);
      setRestorePasswordError('');
    }
  };

  // Función para verificar contraseña y proceder con restauración
  const handleRestoreWithPassword = () => {
    if (restorePassword !== RESTORE_PASSWORD) {
      setRestorePasswordError('Contraseña incorrecta. Inténtalo de nuevo.');
      return;
    }

    // Contraseña correcta, proceder con restauración
    setShowRestorePasswordModal(false);
    setRestorePassword('');
    setRestorePasswordError('');
    restoreBackup(pendingRestoreFile);
  };

  // Verificar si hay backup local (considerando chunks)
  const hasLocalBackup = () => {
    const chunks = localStorage.getItem('ranchoMascotasBackupChunks');
    const date = localStorage.getItem('ranchoMascotasBackupDate');
    return chunks && date;
  };

  const getBackupDate = () => {
    return localStorage.getItem('ranchoMascotasBackupDate');
  };

  // Reconstruir backup desde chunks
  const reconstructBackupFromChunks = () => {
    const chunks = parseInt(localStorage.getItem('ranchoMascotasBackupChunks') || '1');
    
    if (chunks === 1) {
      // Backup simple (no dividido)
      return localStorage.getItem('ranchoMascotasBackup');
    }
    
    // Reconstruir desde chunks
    let reconstructedData = '';
    for (let i = 0; i < chunks; i++) {
      const chunk = localStorage.getItem(`ranchoMascotasBackup_chunk_${i}`);
      if (!chunk) {
        console.error(`Falta el chunk ${i} del backup`);
        return null;
      }
      reconstructedData += chunk;
    }
    
    return reconstructedData;
  };

  return (
    <>
      {/* Botón principal de backup */}
      <div className="fixed bottom-4 left-20 z-40">
        <button
          onClick={() => setShowBackupModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Gestión de Backup"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
      </div>

      {/* Modal de Backup */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Backup</h3>
              <button 
                onClick={() => {
                  setShowBackupModal(false);
                  setBackupStatus('');
                  setRestoreStatus('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Información del estado actual */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Estado Actual</h4>
              <div className="text-sm text-blue-700">
                <p>Total de productos: {Object.values(products).flat().length}</p>
                <p>Por categorías:</p>
                <ul className="ml-4 mt-1">
                  {Object.entries(products).map(([category, items]) => (
                    <li key={category}>- {category}: {items.length}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sección de crear backup */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Crear Backup</h4>
              <button
                onClick={createBackup}
                disabled={isProcessing || loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors"
              >
                {isProcessing ? 'Procesando...' : 'Descargar Backup Completo'}
              </button>
              {backupStatus && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                  {backupStatus}
                </div>
              )}
            </div>

            {/* Sección de restaurar backup */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Restaurar Backup</h4>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              />
              {restoreStatus && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                  {restoreStatus}
                </div>
              )}
            </div>

            {/* Backup local */}
            {hasLocalBackup() && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Backup Local</h4>
                <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                  <p className="text-yellow-800">
                    Backup local disponible: {new Date(getBackupDate()).toLocaleString('es-CL')}
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
                    Tamaño: {localStorage.getItem('ranchoMascotasBackupSize') ? 
                      `${(parseInt(localStorage.getItem('ranchoMascotasBackupSize')) / (1024 * 1024)).toFixed(2)} MB` : 
                      'Calculando...'}
                  </p>
                  <button
                    onClick={() => {
                      try {
                        const backupData = reconstructBackupFromChunks();
                        if (!backupData) {
                          alert('No hay backup local disponible o está corrupto');
                          return;
                        }
                        const dataBlob = new Blob([backupData], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `rancho-mascotas-backup-local-${new Date(getBackupDate()).toISOString().split('T')[0]}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Error descargando backup local:', error);
                        alert('Error al descargar backup local');
                      }
                    }}
                    className="mt-2 text-yellow-700 hover:text-yellow-900 underline text-xs"
                  >
                    Descargar backup local
                  </button>
                </div>
              </div>
            )}

            {/* Mensaje si no hay backup local */}
            {!hasLocalBackup() && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Backup Local</h4>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">
                    No hay backup local disponible
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Crea un backup para guardarlo localmente (se dividirá en partes si es necesario).
                  </p>
                </div>
              </div>
            )}

            {/* Advertencias */}
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">Advertencias</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>La restauración reemplazará TODOS los datos actuales</li>
                <li>Es recomendable hacer un backup antes de restaurar</li>
                <li>Guarda los archivos backup en lugar seguro</li>
                <li>Verifica el archivo backup antes de restaurar</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contraseña para Restauración */}
      {showRestorePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Verificación de Seguridad</h3>
              <button 
                onClick={() => {
                  setShowRestorePasswordModal(false);
                  setRestorePassword('');
                  setRestorePasswordError('');
                  setPendingRestoreFile(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-4">
                <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-gray-900">Protección de Restauración</h4>
                  <p className="text-sm text-gray-600">Esta acción reemplazará todos los datos actuales</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="restore-password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña de Restauración
              </label>
              <input
                type="password"
                id="restore-password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Ingresa la contraseña de restauración"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
              {restorePasswordError && (
                <p className="mt-2 text-sm text-red-600">{restorePasswordError}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Contraseña requerida para restaurar backups. Contacta al administrador si no la conoces.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRestorePasswordModal(false);
                  setRestorePassword('');
                  setRestorePasswordError('');
                  setPendingRestoreFile(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestoreWithPassword}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Restaurar Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BackupManager;
