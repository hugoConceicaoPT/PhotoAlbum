import { createRoot } from 'react-dom/client'
import './css/index.css'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css';
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
