// Importa las funciones que necesitas de los SDK de Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2apJJtx4Ead5ur7-wIOjNSlqF_AVP5NE",
  authDomain: "rancho-productos.firebaseapp.com",
  projectId: "rancho-productos",
  storageBucket: "rancho-productos.firebasestorage.app",
  messagingSenderId: "503435456406",
  appId: "1:503435456406:web:c18f7e1eb1d52d39cef7b7"
};

// Inicializa Firebase evitando múltiples instancias tanto en cliente como en servidor
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
