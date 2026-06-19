/**
 * Estructuras de Datos Optimizadas para Catálogo Web
 * Implementación profesional para alto rendimiento
 */

// 1. HashMap para búsqueda O(1) de productos
export class ProductHashMap {
  constructor() {
    this.map = new Map(); // O(1) acceso
    this.categoryIndex = new Map(); // Índice por categoría
    this.searchIndex = new Map(); // Índice para búsquedas
  }

  // Insertar O(1)
  insert(product) {
    const key = product.id;
    this.map.set(key, product);
    
    // Actualizar índice por categoría
    if (!this.categoryIndex.has(product.category)) {
      this.categoryIndex.set(product.category, new Set());
    }
    this.categoryIndex.get(product.category).add(key);
    
    // Actualizar índice de búsqueda (palabras clave)
    this.updateSearchIndex(product);
  }

  // Búsqueda O(1)
  get(id) {
    return this.map.get(id);
  }

  // Obtener por categoría O(k) donde k es el número de productos en la categoría
  getByCategory(category) {
    const productIds = this.categoryIndex.get(category) || new Set();
    return Array.from(productIds).map(id => this.map.get(id));
  }

  // Búsqueda optimizada con índice invertido
  search(query) {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    // Buscar en índice de búsqueda
    const results = this.searchIndex.get(normalizedQuery) || new Set();
    return Array.from(results).map(id => this.map.get(id));
  }

  updateSearchIndex(product) {
    const fields = [product.name, product.category, product.description || ''];
    const words = fields.join(' ').toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (word.length > 2) { // Ignorar palabras muy cortas
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word).add(product.id);
      }
    });
  }

  // Eliminar O(1)
  delete(id) {
    const product = this.map.get(id);
    if (!product) return;

    this.map.delete(id);
    this.categoryIndex.get(product.category)?.delete(id);
    
    // Limpiar índice de búsqueda
    this.searchIndex.forEach((productSet, word) => {
      productSet.delete(id);
      if (productSet.size === 0) {
        this.searchIndex.delete(word);
      }
    });
  }

  // Obtener todos los productos O(n)
  getAll() {
    return Array.from(this.map.values());
  }
}

// 2. Cache LRU para productos frecuentemente accedidos
export class ProductLRUCache {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Mover al final (más reciente)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      // Actualizar existente
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Eliminar el menos usado (primero en el Map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

// 3. Trie para autocompletado de búsqueda
export class SearchTrie {
  constructor() {
    this.root = {};
    this.isEndOfWord = Symbol('end');
  }

  insert(word, productId) {
    let node = this.root;
    
    for (const char of word.toLowerCase()) {
      if (!node[char]) {
        node[char] = {};
      }
      node = node[char];
    }
    
    if (!node[this.isEndOfWord]) {
      node[this.isEndOfWord] = new Set();
    }
    node[this.isEndOfWord].add(productId);
  }

  search(prefix) {
    let node = this.root;
    
    for (const char of prefix.toLowerCase()) {
      if (!node[char]) return [];
      node = node[char];
    }
    
    return this.getAllWordsFromNode(node);
  }

  getAllWordsFromNode(node) {
    const results = [];
    
    if (node[this.isEndOfWord]) {
      results.push(...node[this.isEndOfWord]);
    }
    
    for (const char in node) {
      if (char !== this.isEndOfWord) {
        results.push(...this.getAllWordsFromNode(node[char]));
      }
    }
    
    return results;
  }
}

// 4. Virtual Scrolling para listas grandes
export class VirtualScrollManager {
  constructor(itemHeight = 200, containerHeight = 600) {
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
  }

  getVisibleItems(items, scrollTop) {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleCount, items.length);
    
    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      offsetY: startIndex * this.itemHeight,
      totalHeight: items.length * this.itemHeight
    };
  }
}

// 5. Debounce para búsquedas en tiempo real
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// 6. Throttle para scroll optimizado
export function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

// 7. Memoization cache para cálculos costosos
export class MemoizationCache {
  constructor() {
    this.cache = new Map();
  }

  memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    return (...args) => {
      const key = keyGenerator(...args);
      
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      
      const result = fn(...args);
      this.cache.set(key, result);
      return result;
    };
  }

  clear() {
    this.cache.clear();
  }
}

// 8. Bloom Filter para verificación rápida de existencia
export class SimpleBloomFilter {
  constructor(size = 1000) {
    this.size = size;
    this.bitArray = new Array(size).fill(false);
    this.hashFunctions = [
      (str) => this.simpleHash(str, 31),
      (str) => this.simpleHash(str, 37),
      (str) => this.simpleHash(str, 41)
    ];
  }

  simpleHash(str, prime) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * prime + str.charCodeAt(i)) % this.size;
    }
    return hash;
  }

  add(item) {
    this.hashFunctions.forEach(hashFn => {
      const index = hashFn(item);
      this.bitArray[index] = true;
    });
  }

  mightContain(item) {
    return this.hashFunctions.every(hashFn => {
      const index = hashFn(item);
      return this.bitArray[index];
    });
  }
}

// 9. Priority Queue para ordenamiento eficiente
export class MinPriorityQueue {
  constructor() {
    this.heap = [];
  }

  enqueue(item, priority) {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && 
          this.heap[leftChild].priority < this.heap[minIndex].priority) {
        minIndex = leftChild;
      }

      if (rightChild < this.heap.length && 
          this.heap[rightChild].priority < this.heap[minIndex].priority) {
        minIndex = rightChild;
      }

      if (minIndex === index) break;

      [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
      index = minIndex;
    }
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

// 10. Lazy Loading Manager
export class LazyLoadManager {
  constructor() {
    this.loadedItems = new Set();
    this.loadingPromises = new Map();
  }

  async load(id, loadFunction) {
    if (this.loadedItems.has(id)) {
      return this.loadingPromises.get(id);
    }

    if (!this.loadingPromises.has(id)) {
      const promise = loadFunction(id).then(result => {
        this.loadedItems.add(id);
        return result;
      });
      this.loadingPromises.set(id, promise);
    }

    return this.loadingPromises.get(id);
  }

  preload(ids, loadFunction) {
    return Promise.all(ids.map(id => this.load(id, loadFunction)));
  }
}

// 11. Performance Monitor
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(name) {
    this.metrics.set(name, performance.now());
  }

  endTimer(name) {
    const startTime = this.metrics.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`${name}: ${duration.toFixed(2)}ms`);
      this.metrics.delete(name);
      return duration;
    }
  }

  measureFunction(name, fn) {
    return (...args) => {
      this.startTimer(name);
      const result = fn(...args);
      this.endTimer(name);
      return result;
    };
  }
}

// Exportar todo como un paquete
export const DataStructures = {
  ProductHashMap,
  ProductLRUCache,
  SearchTrie,
  VirtualScrollManager,
  debounce,
  throttle,
  MemoizationCache,
  SimpleBloomFilter,
  MinPriorityQueue,
  LazyLoadManager,
  PerformanceMonitor
};
