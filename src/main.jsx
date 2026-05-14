import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/solohub-sw.js')
      .catch((error) => console.warn('SoloHub service worker registration failed:', error));
  });
}


// SoloHub production-only service worker.
// In development, unregister service workers so localhost does not serve stale cached code.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const isLocalDev =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname.startsWith('192.168.') ||
      location.hostname.startsWith('10.') ||
      location.hostname.startsWith('172.');

    if (import.meta.env.PROD && !isLocalDev) {
      navigator.serviceWorker
        .register('/solohub-sw.js')
        .catch((error) => console.warn('SoloHub service worker registration failed:', error));
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.includes('solohub')).map((key) => caches.delete(key)));
      }
    }
  });
}
