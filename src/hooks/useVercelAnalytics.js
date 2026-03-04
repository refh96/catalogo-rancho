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

    // Simular datos reales de Vercel Analytics
    // En producción, estos vendrían de la API de Vercel
    const fetchAnalyticsData = async () => {
      try {
        // Aquí irían las llamadas reales a la API de Vercel
        // Por ahora, simulamos datos realistas
        const mockData = {
          visitors: 1247,
          pageViews: 3841,
          topPages: [
            { path: '/', views: 892, percentage: 23.2 },
            { path: '/perros', views: 456, percentage: 11.9 },
            { path: '/gatos', views: 387, percentage: 10.1 },
            { path: '/accesorios', views: 298, percentage: 7.8 },
            { path: '/farmacia', views: 234, percentage: 6.1 }
          ],
          countries: [
            { code: 'CL', name: 'Chile', visitors: 892, percentage: 71.5 },
            { code: 'AR', name: 'Argentina', visitors: 156, percentage: 12.5 },
            { code: 'MX', name: 'México', visitors: 98, percentage: 7.9 },
            { code: 'PE', name: 'Perú', visitors: 67, percentage: 5.4 },
            { code: 'CO', name: 'Colombia', visitors: 34, percentage: 2.7 }
          ],
          devices: [
            { type: 'Desktop', count: 723, percentage: 58.0 },
            { type: 'Mobile', count: 456, percentage: 36.6 },
            { type: 'Tablet', count: 68, percentage: 5.4 }
          ],
          bounceRate: 32.4,
          avgSessionDuration: 222 // en segundos
        };

        setRealTimeData(mockData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalyticsData();
    
    // Actualizar datos cada 30 segundos
    const interval = setInterval(fetchAnalyticsData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const trackEvent = (eventName, properties = {}) => {
    if (typeof window !== 'undefined') {
      // En producción, usar analytics.track()
      console.log('Analytics Event:', eventName, properties);
      
      // Importación dinámica para tracking
      import('@vercel/analytics').then(({ track }) => {
        track(eventName, properties);
      }).catch(error => {
        console.warn('Error al trackear evento:', error);
      });
    }
  };

  const trackPageView = (path) => {
    if (typeof window !== 'undefined') {
      // En producción, usar analytics.track()
      console.log('Page View:', path);
      
      // Importación dinámica para page view
      import('@vercel/analytics').then(({ track }) => {
        track('pageview', { path });
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
