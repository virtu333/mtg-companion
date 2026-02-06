import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import MulliganPage from './pages/MulliganPage';
import ComingSoonPage from './pages/ComingSoonPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/mulligan" replace />} />
            <Route path="mulligan" element={<MulliganPage />} />
            <Route path="hand-reading" element={<ComingSoonPage />} />
            <Route path="profile" element={<ComingSoonPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
