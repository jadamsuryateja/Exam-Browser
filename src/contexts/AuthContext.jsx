import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(userData));
      // Connect to WebSocket
      socketService.connect();
    }
    setLoading(false);

    // Cleanup WebSocket connection
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Modify the login function to include filters
  const login = async (credentials, role, filters = null) => {
    try {
      const endpoint = role === 'admin' 
        ? 'http://192.168.29.44:5000/api/admin/login'
        : 'http://192.168.29.44:5000/api/student/login';

      const response = await axios.post(endpoint, {
        ...credentials,
        filters // Include filters in the request body
      });
      
      const { token, user: userData } = response.data;

      // Always include filters object for students, even if empty
      const userWithFilters = role === 'student' 
        ? { 
            ...userData, 
            filters: filters || { year: '', semester: '' } 
          }
        : userData;

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update state and localStorage
      setUser(userWithFilters);
      localStorage.setItem('user', JSON.stringify(userWithFilters));
      localStorage.setItem('token', token);

      // Connect WebSocket
      socketService.connect();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    // Disconnect WebSocket
    socketService.disconnect();
    setUser(null);
  };

  const register = async (userData) => {
    try {
      await axios.post('http://192.168.29.44:5000/api/student/register', userData);
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};