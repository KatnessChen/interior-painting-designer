import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Avatar, IconButton, Popover, Box } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import { useAuth } from '../contexts/AuthContext';
import AuthPanel from './AuthPanel';
import StorageManager from './StorageManager';

const Header: React.FC = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [showStorageManager, setShowStorageManager] = useState(false);

  const handleProfileClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', p: 2 }}>
          {/* Brand Section */}
          <Box>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                color: 'white',
                letterSpacing: '0.5px',
              }}
            >
              Vizion Studio
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 500,
              }}
            >
              Your AI Interior Design Simulator
            </Typography>
          </Box>

          {/* Right Section - Storage Manager & Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => setShowStorageManager(true)}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
              title="Manage Storage"
            >
              <StorageIcon />
            </IconButton>

            <IconButton
              onClick={handleProfileClick}
              sx={{
                p: 0,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              <Avatar
                alt={user?.displayName || 'User'}
                src={user?.photoURL || undefined}
                sx={{ width: 40, height: 40 }}
              />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Toolbar spacer to prevent content from going under fixed AppBar */}
      <Toolbar />

      {/* Auth Panel Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ width: 400, maxWidth: '90vw' }}>
          <AuthPanel />
        </Box>
      </Popover>

      {/* Storage Manager Modal */}
      <StorageManager isOpen={showStorageManager} onClose={() => setShowStorageManager(false)} />
    </>
  );
};

export default Header;
