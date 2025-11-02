import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Box } from '@mui/material';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <Box sx={{ flex: 1 }}>
            <LandingPage />
          </Box>
        </Box>
        <SpeedInsights />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
