// Utilidad para programar backups automáticos
export class BackupScheduler {
  constructor() {
    this.backupInterval = null;
    this.lastBackupTime = localStorage.getItem('lastAutoBackup');
  }

  // Iniciar programación de backups
  startBackupSchedule(intervalHours = 24) {
    // Detener programación existente
    this.stopBackupSchedule();

    // Calcular milisegundos
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Programar backup periódico
    this.backupInterval = setInterval(() => {
      this.performAutoBackup();
    }, intervalMs);

    console.log(`Programación de backups iniciada: cada ${intervalHours} horas`);
  }

  // Detener programación
  stopBackupSchedule() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('Programación de backups detenida');
    }
  }

  // Realizar backup automático
  async performAutoBackup() {
    try {
      console.log('Iniciando backup automático...');

      // Obtener productos de Firestore
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const productsCollection = collection(db, 'products');
      const querySnapshot = await getDocs(productsCollection);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        type: 'auto_backup',
        products: []
      };

      querySnapshot.forEach((doc) => {
        backupData.products.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Guardar en localStorage con división si es necesario
      const dataStr = JSON.stringify(backupData, null, 2);
      const estimatedSize = new Blob([dataStr]).size;
      const sizeInMB = estimatedSize / (1024 * 1024);
      const maxChunkSize = 4 * 1024 * 1024; // 4MB máximo por chunk
      
      if (sizeInMB < 4) {
        // Backup pequeño: guardar normalmente
        localStorage.setItem('ranchoMascotasAutoBackup', dataStr);
        localStorage.setItem('lastAutoBackup', new Date().toISOString());
      } else {
        // Backup grande: dividir en chunks
        let chunkIndex = 0;
        
        for (let i = 0; i < dataStr.length; i += maxChunkSize) {
          const chunk = dataStr.slice(i, i + maxChunkSize);
          localStorage.setItem(`ranchoMascotasAutoBackup_chunk_${chunkIndex}`, chunk);
          chunkIndex++;
        }
        
        // Guardar metadata
        localStorage.setItem('lastAutoBackup', new Date().toISOString());
        localStorage.setItem('ranchoMascotasAutoBackupChunks', chunks.length.toString());
        
        console.log(`Backup automático dividido en ${chunks.length} chunks (${sizeInMB.toFixed(2)} MB total)`);
      }

      // Mantener solo los últimos 5 backups automáticos
      this.cleanupOldBackups();

      console.log(`Backup automático completado: ${backupData.products.length} productos`);
      
      // Mostrar notificación
      this.showBackupNotification('Backup automático completado');

    } catch (error) {
      console.error('Error en backup automático:', error);
      this.showBackupNotification('Error en backup automático', 'error');
    }
  }

  // Limpiar backups antiguos (mantener últimos 5)
  cleanupOldBackups() {
    const backupKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ranchoMascotasAutoBackup_')) {
        backupKeys.push(key);
      }
    }

    // Ordenar por fecha y mantener solo los 5 más recientes
    backupKeys.sort((a, b) => {
      const dateA = new Date(a.split('_')[1]);
      const dateB = new Date(b.split('_')[1]);
      return dateB - dateA;
    });

    // Eliminar backups antiguos
    backupKeys.slice(5).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Mostrar notificación de backup
  showBackupNotification(message, type = 'success') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`;
    notification.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${type === 'success' 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
          }
        </svg>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Obtener estado de los backups
  getBackupStatus() {
    const lastBackup = localStorage.getItem('lastAutoBackup');
    const hasAutoBackup = localStorage.getItem('ranchoMascotasAutoBackup');
    
    return {
      lastBackupTime: lastBackup ? new Date(lastBackup) : null,
      hasAutoBackup: !!hasAutoBackup,
      autoBackupCount: this.getAutoBackupCount()
    };
  }

  // Contar backups automáticos
  getAutoBackupCount() {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ranchoMascotasAutoBackup')) {
        count++;
      }
    }
    return count;
  }

  // Restaurar desde backup automático
  restoreFromAutoBackup(backupIndex = 0) {
    const backupKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ranchoMascotasAutoBackup')) {
        backupKeys.push(key);
      }
    }

    if (backupKeys.length === 0) {
      throw new Error('No hay backups automáticos disponibles');
    }

    // Ordenar por fecha
    backupKeys.sort((a, b) => {
      const dateA = new Date(a.includes('_') ? a.split('_')[1] : a);
      const dateB = new Date(b.includes('_') ? b.split('_')[1] : b);
      return dateB - dateA;
    });

    const selectedKey = backupKeys[backupIndex];
    const backupData = JSON.parse(localStorage.getItem(selectedKey));

    return backupData;
  }
}

// Exportar instancia global
export const backupScheduler = new BackupScheduler();
