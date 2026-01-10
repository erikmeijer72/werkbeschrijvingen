import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- Environment Variable Polyfill for Vercel/Vite ---
// Vercel only exposes variables starting with VITE_ to the browser.
// The Google GenAI SDK expects process.env.API_KEY.
// This shim bridges the gap.
try {
  if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
  }
  if (!process.env) {
    (window as any).process.env = {};
  }
  
  // @ts-ignore - Handle Vite specific env injection
  const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  
  // Prioritize VITE_API_KEY if available (Vercel standard)
  if (viteEnv && viteEnv.VITE_API_KEY) {
    process.env.API_KEY = viteEnv.VITE_API_KEY;
  }
} catch (error) {
  console.warn("Failed to initialize environment variables:", error);
}
// -----------------------------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}