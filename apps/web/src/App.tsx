import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkAuthBridge } from './lib/clerkHelpers';
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import MulliganPage from './pages/MulliganPage';
import ComingSoonPage from './pages/ComingSoonPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AuthSync from './hooks/useAuthSync';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/mulligan" replace />} />
          <Route path="mulligan" element={<MulliganPage />} />
          <Route path="hand-reading" element={<ComingSoonPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  // Skip ClerkProvider if no key (local dev without Clerk)
  if (!clerkPubKey) {
    return (
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPubKey}>
        <ClerkAuthBridge>
          <AuthSync />
          <AppRoutes />
        </ClerkAuthBridge>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
