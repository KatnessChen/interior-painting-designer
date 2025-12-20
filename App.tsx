import React from 'react';
import { Provider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './stores/store';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AsideSection from './components/layout/AsideSection';

// Protected Layout Component
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="h-screen flex flex-col overflow-scroll">
      <Header />
      <div className="flex-1 flex" style={{ maxHeight: 'calc(100vh - var(--header-height))' }}>
        {/* Fixed Aside Section */}
        <AsideSection />
        {/* Main Content with left margin to avoid overlap */}
        <div className="flex-1 overflow-scroll">
          <LandingPage />
        </div>
      </div>
    </div>
  );
};

// App Content (inside AuthProvider)
const AppContent: React.FC = () => {
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ProtectedLayout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SpeedInsights />
      </Router>
    </GoogleOAuthProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Provider>
  );
};

export default App;
