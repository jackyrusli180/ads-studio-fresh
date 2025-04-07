import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Button, Paper, TextField, Alert } from '@mui/material';

const TestAuth = () => {
  const [authStatus, setAuthStatus] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  const testAuth = async () => {
    setLoading(true);
    setError('');
    setAuthStatus('');
    
    try {
      const response = await axios.get('/api/test-auth/');
      setAuthStatus(`Authentication successful! Logged in as: ${response.data.user}`);
    } catch (error) {
      console.error('Auth test error:', error);
      setError(`Authentication failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const viewLocalStorage = () => {
    const token = localStorage.getItem('token');
    const refresh = localStorage.getItem('refresh');
    const user = localStorage.getItem('user');
    
    setAuthStatus(`
      Token: ${token ? token.substring(0, 20) + '...' : 'Not set'}
      Refresh: ${refresh ? refresh.substring(0, 20) + '...' : 'Not set'}
      User: ${user ? JSON.stringify(JSON.parse(user), null, 2) : 'Not set'}
    `);
  };

  const setCustomToken = () => {
    if (tokenInput) {
      localStorage.setItem('token', tokenInput);
      setToken(tokenInput);
      setAuthStatus(`Token set to: ${tokenInput.substring(0, 20)}...`);
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setToken('');
    setUser({});
    setAuthStatus('All tokens cleared');
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>Authentication Test Panel</Typography>
        
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Current Auth Status: {localStorage.getItem('token') ? 'Token Present' : 'No Token'}
        </Typography>
        
        {user && user.username && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            Logged in as: {user.username}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button 
            variant="contained" 
            onClick={testAuth}
            disabled={loading}
          >
            Test Authentication
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={viewLocalStorage}
          >
            View LocalStorage
          </Button>
          
          <Button 
            variant="outlined" 
            color="error"
            onClick={clearTokens}
          >
            Clear Tokens
          </Button>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Custom JWT Token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Button 
            variant="contained" 
            onClick={setCustomToken}
            disabled={!tokenInput}
          >
            Set Token
          </Button>
        </Box>
        
        {authStatus && (
          <Alert severity="info" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {authStatus}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default TestAuth; 