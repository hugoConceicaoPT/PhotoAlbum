import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
