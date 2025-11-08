import React, { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import AsideSection from './components/layout/AsideSection';

const App: React.FC = () => {
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || '';

  // Initialize storage service on mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
      } catch (error) {
        console.error('Failed to initialize storage service:', error);
      }
    };

    initializeStorage();
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
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
        <SpeedInsights />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
