import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from './pages/Home';

const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const Optout = lazy(() => import('./pages/Optout'));
const NPSReview = lazy(() => import('./pages/NPSReview'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const ShoppingListClient = lazy(() => import('./pages/ShoppingListClient'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0a0a0a',
    }}>
      <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Suspense fallback={<PageLoader />}><Portfolio /></Suspense>} />
          <Route path="/avaliacao/:leadId" element={<Suspense fallback={<PageLoader />}><NPSReview /></Suspense>} />
          <Route path="/sair/:leadId" element={<Suspense fallback={<PageLoader />}><Optout /></Suspense>} />
          <Route path="/lista-compras/:leadId" element={<Suspense fallback={<PageLoader />}><ShoppingListClient /></Suspense>} />
          <Route path="/admin/login" element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>} />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;

