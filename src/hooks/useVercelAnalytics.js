import { useEffect, useState } from 'react';

export function useVercelAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [realTimeData, setRealTimeData] = useState({
    visitors: 0,
    pageViews: 0,
    topPages: [],
    countries: [],
    devices: [],
    bounceRate: 0,
    avgSessionDuration: 0
  });

  useEffect(() => {
    // En Next.js, Vercel Analytics se inicializa automáticamente
    // Solo necesitamos importar las funciones cuando las necesitemos
    const initializeAnalytics = async () => {
      try {
        // Importación dinámica para evitar SSR issues
        const { getAnalytics } = await import('@vercel/analytics/server');
        const analyticsInstance = getAnalytics();
        setAnalytics(analyticsInstance);
      } catch (error) {
        console.warn('Vercel Analytics no disponible en este entorno:', error);
      }
    };

    initializeAnalytics();

    // Obtener datos reales de Vercel Analytics
    const fetchAnalyticsData = async () => {
      try {
        const response = await fetch('/api/analytics');
        const result = await response.json();
        
        if (result.success) {
          setRealTimeData(result.data);
          console.log('✅ Analytics actualizados:', result.timestamp);
        } else {
          console.error('❌ Error en analytics:', result.error);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        
        // Fallback a datos mínimos si hay error
        setRealTimeData({
          visitors: 0,
          pageViews: 0,
          topPages: [],
          countries: [],
          devices: [],
          bounceRate: 0,
          avgSessionDuration: 0
        });
      }
    };

    // Cargar datos iniciales
    fetchAnalyticsData();
    
    // Actualizar datos cada 30 segundos para simular tiempo real
    const interval = setInterval(fetchAnalyticsData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const trackEvent = (eventName, properties = {}) => {
    if (typeof window !== 'undefined') {
      // Importación dinámica para tracking
      import('@vercel/analytics').then(({ track }) => {
        track(eventName, properties);
        console.log('📊 Event tracked:', eventName, properties);
      }).catch(error => {
        console.warn('Error al trackear evento:', error);
      });
    }
  };

  const trackPageView = (path) => {
    if (typeof window !== 'undefined') {
      // Importación dinámica para page view
      import('@vercel/analytics').then(({ track }) => {
        track('pageview', { path });
        console.log('📈 Page view tracked:', path);
      }).catch(error => {
        console.warn('Error al trackear page view:', error);
      });
    }
  };

  return {
    analytics,
    realTimeData,
    trackEvent,
    trackPageView
  };
}
