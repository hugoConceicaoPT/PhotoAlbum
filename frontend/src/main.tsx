import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
// Tokens and app styles must load after Bootstrap so they can override it.
import './css/tokens.css'
import './css/index.css'
import App from './App.tsx'
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


import { BrowserRouter as Router } from 'react-router-dom';
import { StrictMode, Suspense } from 'react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Router>
        <App />
      </Router>
    </Suspense>
  </StrictMode>
);
