import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Layout from './components/Layout';
import IdeaBank from './components/IdeaBank';
import AIImage from './components/AIImage';
import TestAuth from './components/TestAuth';
import CreativeDetails from './components/AIImage/components/CreativeDetails';
import './App.css';

// Create a custom theme to match Ads Studio
const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#6200EA', // Purple for AI features
      light: '#B388FF',
      dark: '#4A148C',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#4CAF50',
    },
    warning: {
      main: '#FF9800',
    },
    info: {
      main: '#2196F3',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
        contained: {
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Helper function to create a protected route
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Login route */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          
          {/* Test Auth route - accessible regardless of auth status */}
          <Route path="/test-auth" element={<TestAuth />} />
          
          {/* Main horizontal navigation routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/campaign" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/user-engagement" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/user-tagging" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/approval" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Ads Studio main route */}
          <Route path="/ads-studio" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* User Management Routes */}
          <Route path="/user-groups" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/user-tags" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/user-persona" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* AIGC Routes */}
          <Route path="/ads-studio/aigc" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/aigc/ai-image" element={<ProtectedRoute><AIImage /></ProtectedRoute>} />
          <Route path="/ads-studio/aigc/ai-video" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/aigc/creative/:id" element={<ProtectedRoute><CreativeDetails /></ProtectedRoute>} />
          
          {/* Asset Manager Routes */}
          <Route path="/ads-studio/asset-manager" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/asset-manager/library" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/asset-manager/approval-flow" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/asset-manager/my-approvals" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Ads Manager Routes */}
          <Route path="/ads-studio/ads-manager" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/ads-manager/ads-builder" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/ads-manager/automated-rules" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Idea Bank Routes */}
          <Route path="/ads-studio/idea-bank" element={<ProtectedRoute><IdeaBank /></ProtectedRoute>} />
          <Route path="/ads-studio/idea-bank/content-angles" element={<ProtectedRoute><IdeaBank /></ProtectedRoute>} />
          <Route path="/ads-studio/idea-bank/trends" element={<ProtectedRoute><IdeaBank /></ProtectedRoute>} />
          <Route path="/ads-studio/idea-bank/token-listings" element={<ProtectedRoute><IdeaBank /></ProtectedRoute>} />
          <Route path="/ads-studio/idea-bank/ad-library" element={<ProtectedRoute><IdeaBank /></ProtectedRoute>} />
          
          {/* Templates Routes */}
          <Route path="/ads-studio/templates" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/templates/comfy" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Analytics Routes */}
          <Route path="/ads-studio/analytics" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/analytics/performance" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ads-studio/analytics/reports" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
