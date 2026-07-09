import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a2540',
            color: '#E8E6FF',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#0A0F1E' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#0A0F1E' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
