// Utilidad para generar archivos Excel reales usando SheetJS
import * as XLSX from 'xlsx';

export const generateExcelFile = (data, selectedFields) => {
  // Preparar datos para Excel
  const worksheetData = [];
  
  // Agregar encabezados
  const headers = [];
  const fieldOrder = ['name', 'price', 'stock', 'category', 'createdAt', 'productId'];
  
  fieldOrder.forEach(field => {
    if (selectedFields[field] && field !== 'addRowNumbers' && field !== 'addSummary' && field !== 'addEmptyRow' && field !== 'wrapText' && field !== 'formatCurrency') {
      headers.push(getFieldDisplayName(field));
    }
  });
  worksheetData.push(headers);
  
  // Agregar datos
  data.forEach((row, index) => {
    const dataRow = [];
    
    // Agregar número de fila si está activado
    if (selectedFields.addRowNumbers) {
      dataRow.push(index + 1);
    }
    
    // Mapear campos en el orden correcto
    fieldOrder.forEach(field => {
      if (selectedFields[field] && field !== 'addRowNumbers' && field !== 'addSummary' && field !== 'addEmptyRow' && field !== 'wrapText' && field !== 'formatCurrency') {
        let value = row[field] || '';
        
        // Formatear según tipo de campo
        if (field === 'price') {
          // Mantener como número para Excel
          value = parseFloat(value) || 0;
        } else if (field === 'stock') {
          // Mantener como número para Excel
          value = parseInt(value) || 0;
        } else if (typeof value === 'string') {
          // Limpiar texto
          value = value.trim();
          // Reemplazar saltos de línea
          value = value.replace(/\n/g, ' ');
        }
        
        dataRow.push(value);
      }
    });
    
    worksheetData.push(dataRow);
  });
  
  // Agregar resumen
  if (selectedFields.addSummary) {
    worksheetData.push([]);
    worksheetData.push([]);
    worksheetData.push(['RESUMEN DE CATÁLOGO']);
    worksheetData.push(['Total de productos', data.length]);
    worksheetData.push([]);
    worksheetData.push(['PRODUCTOS POR CATEGORÍA']);
    
    // Contar por categorías
    const categoryCount = {};
    data.forEach(row => {
      const category = row['category'] || 'Sin categoría';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    Object.entries(categoryCount).forEach(([category, count]) => {
      worksheetData.push([category, count]);
    });
    
    worksheetData.push([]);
    worksheetData.push(['Fecha de exportación', new Date().toLocaleString('es-CL')]);
  }
  
  return worksheetData;
};

// Función para descargar Excel usando SheetJS
export const downloadExcelFile = (worksheetData, filename) => {
  try {
    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo");
    
    // Generar archivo y descargar
    XLSX.writeFile(wb, filename);
    
    return true;
  } catch (error) {
    console.error('Error generando Excel:', error);
    return false;
  }
};

// Obtener nombre de campo
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
