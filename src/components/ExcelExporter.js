'use client';
import { useState } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateExcelFile, downloadExcelFile } from '@/utils/excelGenerator';

const ExcelExporter = () => {
  const { products, loading } = useProducts();
  const { user } = useAuth();
  const [exportStatus, setExportStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    name: true,
    price: true,
    stock: true,
    category: true,
    createdAt: false,
    productId: false
  });
  const [formatOptions, setFormatOptions] = useState({
    addRowNumbers: true,
    addSummary: true,
    addEmptyRow: true,
    wrapText: true,
    formatCurrency: true
  });

  // Solo el administrador puede acceder
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Función para generar y descargar Excel
  const generateExcel = async () => {
    try {
      setIsProcessing(true);
      setExportStatus('Generando Excel...');

      // Obtener todos los productos
      const allProducts = [];
      
      // Recorrer todas las categorías
      Object.entries(products).forEach(([category, categoryProducts]) => {
        categoryProducts.forEach(product => {
          allProducts.push({
            id: product.id,
            category: category,
            name: product.name,
            price: product.price,
            stock: product.stock,
            createdAt: product.createdAt
          });
        });
      });

      // Ordenar productos alfabéticamente por nombre
      allProducts.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      });

      // Preparar datos para Excel
      const excelData = allProducts.map(product => {
        const row = {};
        
        // Campos seleccionados
        if (selectedFields.name) row['name'] = product.name || '';
        if (selectedFields.price) row['price'] = product.price || 0;
        if (selectedFields.stock) row['stock'] = product.stock || 0;
        if (selectedFields.category) row['category'] = getCategoryDisplayName(product.category);
        if (selectedFields.createdAt) row['createdAt'] = product.createdAt ? new Date(product.createdAt).toLocaleDateString('es-CL') : '';
        if (selectedFields.productId) row['productId'] = product.id;
        
        return row;
      });

      // Generar y descargar archivo Excel usando SheetJS
      const worksheetData = generateExcelFile(excelData, selectedFields);
      const success = downloadExcelFile(worksheetData, `rancho-mascotas-catalogo-${new Date().toISOString().split('T')[0]}.xlsx`);

      if (success) {
        setExportStatus(`Excel generado exitosamente con ${allProducts.length} productos`);
      } else {
        setExportStatus('Error al generar el archivo Excel');
      }
      
    } catch (error) {
      console.error('Error generando Excel:', error);
      setExportStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para generar CSV
  const generateCSV = (data) => {
    if (data.length === 0) return '';

    // Obtener encabezados
    const headers = Object.keys(data[0]);
    
    // Crear CSV con formato de tabla tradicional
    const csvRows = [];
    
    // Agregar encabezados
    const formattedHeaders = headers.map(header => {
      const displayName = getFieldDisplayName(header);
      // Envolver en comillas para mejor visualización en Excel
      return `"${displayName}"`;
    });
    csvRows.push(formattedHeaders.join(','));
    
    // Agregar filas vacías para separación
    csvRows.push('');
    
    // Agregar filas de datos con cada campo en su columna
    data.forEach((row, index) => {
      const values = headers.map(header => {
        let value = row[header] || '';
        
        // Formatear valores según tipo y opciones
        if (header === 'Precio') {
          // Formato de moneda - solo número sin comillas
          if (formatOptions.formatCurrency && value) {
            value = parseFloat(value).toString();
          }
          // Limpiar para que sea solo número
          value = value.toString().replace(/[^\d.-]/g, '');
        } else if (header === 'Stock') {
          // Valores numéricos sin comillas
          value = value.toString().replace(/[^\d.-]/g, '');
        } else if (typeof value === 'string') {
          // Texto: limpiar y formatear
          value = value.trim();
          // Reemplazar saltos de línea por espacios
          value = value.replace(/\n/g, ' ');
          // Escapar comillas dobles
          value = value.replace(/"/g, '""');
          // SIEMPRE envolver texto en comillas para asegurar separación
          value = `"${value}"`;
        }
        
        return value;
      });
      
      // Unir con comas - esto es clave para la separación de columnas
      csvRows.push(values.join(','));
    });

    // Agregar filas de resumen al final (si está activado)
    if (formatOptions.addSummary) {
      csvRows.push('');
      csvRows.push('"RESUMEN DE CATÁLOGO"');
      csvRows.push('"Total de productos",' + data.length);
      
      // Contar por categorías
      const categoryCount = {};
      data.forEach(row => {
        const category = row['Categoría'] || 'Sin categoría';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      
      csvRows.push('');
      csvRows.push('"PRODUCTOS POR CATEGORÍA"');
      Object.entries(categoryCount).forEach(([category, count]) => {
        csvRows.push(`"${category}",${count}`);
      });
      
      // Agregar fecha de generación
      csvRows.push('');
      csvRows.push('"Fecha de exportación",' + `"${new Date().toLocaleString('es-CL')}"`);
    }

    return csvRows.join('\n');
  };

  // Función para obtener nombre de categoría
  const getCategoryDisplayName = (category) => {
    const categoryNames = {
      'perros': 'Perros',
      'gatos': 'Gatos',
      'mascotasPequeñas': 'Mascotas Pequeñas',
      'accesorios': 'Accesorios',
      'farmacia': 'Farmacia'
    };
    return categoryNames[category] || category;
  };

  // Función para formatear guía alimentación
  const formatFeedingGuide = (guideTable) => {
    if (!guideTable || !guideTable.rows) return '';
    return guideTable.rows.slice(0, 2).map(row => 
      `${row.values[0]}: ${row.values[1] || ''}`
    ).join(' | ');
  };

  // Función para formatear info farmacia
  const formatPharmacyInfo = (info) => {
    const parts = [];
    if (info.presentation) parts.push(`Presentación: ${info.presentation}`);
    if (info.activeIngredient) parts.push(`Principio Activo: ${info.activeIngredient}`);
    if (info.usage) parts.push(`Uso: ${info.usage.substring(0, 50)}...`);
    return parts.join(' | ');
  };

  // Manejar cambio de campos
  const handleFieldChange = (field) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Seleccionar todos los campos
  const selectAllFields = () => {
    setSelectedFields(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = true;
      });
      return updated;
    });
  };

  // Deseleccionar todos los campos
  const deselectAllFields = () => {
    setSelectedFields(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = key === 'name' || key === 'price' || key === 'category'; // Mantener campos esenciales
      });
      return updated;
    });
  };

  return (
    <>
      {/* Botón de exportación Excel */}
      <div className="fixed bottom-4 left-36 z-40">
        <button
          onClick={() => setShowExportModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Exportar a Excel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>

      {/* Modal de Exportación Excel */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Exportar Catálogo a Excel</h3>
              <button 
                onClick={() => {
                  setShowExportModal(false);
                  setExportStatus('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Información del catálogo */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Información del Catálogo</h4>
              <div className="text-sm text-green-700">
                <p>Total de productos: {Object.values(products).flat().length}</p>
                <p>Por categorías:</p>
                <ul className="ml-4 mt-1">
                  {Object.entries(products).map(([category, items]) => (
                    <li key={category}>- {getCategoryDisplayName(category)}: {items.length}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Selección de campos */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Campos a Exportar</h4>
                <div className="space-x-2">
                  <button
                    onClick={selectAllFields}
                    className="text-sm text-green-600 hover:text-green-800 underline"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={deselectAllFields}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedFields).map(([field, isSelected]) => (
                  <label key={field} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleFieldChange(field)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {getFieldDisplayName(field)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Botón de exportación */}
            <div className="mb-6">
              <button
                onClick={generateExcel}
                disabled={isProcessing || loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando Excel...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar Excel (.csv)
                  </>
                )}
              </button>
              {exportStatus && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                  {exportStatus}
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Información de Exportación</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>El archivo se descargará en formato CSV (compatible con Excel)</li>
                <li>Puedes abrirlo directamente en Excel o Google Sheets</li>
                <li>Los campos largos se truncarán para mejor visualización</li>
                <li>El ID del producto se incluye siempre para referencia</li>
                <li>Los valores numéricos (precio, stock) se exportan como números</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Función para obtener nombre de campo
const getFieldDisplayName = (field) => {
  const fieldNames = {
    name: 'Nombre del Producto',
    price: 'Precio',
    stock: 'Stock',
    category: 'Categoría',
    brand: 'Marca',
    weight: 'Peso/Tamaño',
    description: 'Descripción',
    composition: 'Composición',
    feedingGuide: 'Guía Alimentación',
    pharmacyInfo: 'Información Farmacia',
    featured: 'Producto Destacado',
    createdAt: 'Fecha de Creación',
    productId: 'ID Producto'
  };
  return fieldNames[field] || field;
};

export default ExcelExporter;
