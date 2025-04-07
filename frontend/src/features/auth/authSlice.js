import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Load user from localStorage
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

// Initial state
const initialState = {
  token: storedToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedToken,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    console.log('LOGIN ATTEMPT - Username:', username);
    console.log('API URL being used:', axios.defaults.baseURL);
    
    try {
      // First try the custom login endpoint
      try {
        console.log('Attempting custom login endpoint: /api/users/login/');
        const userLoginResponse = await axios.post(
          '/api/users/login/',
          { username, password },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        console.log('Custom login successful:', userLoginResponse.data);
        // If successful, return the data
        return userLoginResponse.data;
      } catch (userLoginError) {
        console.log('Custom login failed with error:', userLoginError.response?.data || userLoginError.message);
        console.log('Status code:', userLoginError.response?.status);
        console.log('Trying JWT token endpoint');
        
        // If custom login fails, try the JWT token endpoint
        const tokenResponse = await axios.post(
          '/api/token/',
          { username, password },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        console.log('JWT token endpoint successful:', tokenResponse.data);
        
        // Get user info after obtaining token
        const config = {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access}`
          }
        };
        
        const userResponse = await axios.get('/api/users/current/', config);
        console.log('User info retrieved:', userResponse.data);
        
        return {
          token: tokenResponse.data.access,
          refresh: tokenResponse.data.refresh,
          user: userResponse.data
        };
      }
    } catch (error) {
      console.error('Login error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: error.config
      });
      return rejectWithValue(
        error.response?.data?.detail || error.response?.data?.error || 'Authentication failed'
      );
    }
  }
);

// Async thunk for logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Only call logout endpoint if we're using a session-based auth
      // For JWT, we just remove tokens
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          await axios.post('/api/users/logout/', {});
        } catch (error) {
          console.log('Logout endpoint not available, just clearing local storage');
        }
      }
      
      // Clear localStorage regardless
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      
      return null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Logout failed'
      );
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    bypassLogin: (state) => {
      // Create a mock user and token for development
      const mockUser = {
        id: 1,
        username: 'jackyrusli',
        email: 'jackyrusli180@gmail.com',
        first_name: 'Jacky',
        last_name: 'Rusli'
      };
      const mockToken = 'mock-token-for-development';
      
      // Update state
      state.isLoading = false;
      state.isAuthenticated = true;
      state.token = mockToken;
      state.user = mockUser;
      state.error = null;
      
      // Save to localStorage
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        
        // Handle token and user data
        if (action.payload.token) {
          state.token = action.payload.token;
          localStorage.setItem('token', action.payload.token);
          
          if (action.payload.refresh) {
            localStorage.setItem('refresh', action.payload.refresh);
          }
        }
        
        state.user = action.payload.user;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout cases
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetError, bypassLogin } = authSlice.actions;
export default authSlice.reducer; 