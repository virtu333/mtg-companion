import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import MulliganPage from './pages/MulliganPage';
import ComingSoonPage from './pages/ComingSoonPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/mulligan" replace />} />
          <Route path="mulligan" element={<MulliganPage />} />
          <Route path="hand-reading" element={<ComingSoonPage />} />
          <Route path="profile" element={<ComingSoonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
