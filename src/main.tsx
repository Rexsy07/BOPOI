import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const msg = String(event.reason?.message || event.reason || '');
      const stack = String(event.reason?.stack || '');
      if (
        msg.includes('WebSocket closed without opened') ||
        stack.includes('@vite/client')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(<App />);

