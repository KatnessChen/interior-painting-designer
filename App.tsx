import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/react';
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <LandingPage />
        <SpeedInsights />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
