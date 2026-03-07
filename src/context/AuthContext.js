import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonationLogId, setImpersonationLogId] = useState(null);
  const [adminName, setAdminName] = useState('');

  // Restore impersonation state on mount
  useEffect(() => {
    const savedAdmin = sessionStorage.getItem('admin_token');
    if (savedAdmin) {
      setImpersonating(true);
      setImpersonationLogId(sessionStorage.getItem('impersonation_log_id') || null);
      setAdminName(sessionStorage.getItem('admin_name') || 'Admin');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
      }
    } else {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    localStorage.setItem('auth_token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleSession = async (sessionId) => {
    const response = await fetch(`${API_URL}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Google authentication failed');
    }

    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('auth_token');
    // Clear impersonation state on full logout
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_name');
    sessionStorage.removeItem('impersonation_log_id');
    setImpersonating(false);
    setImpersonationLogId(null);
    setAdminName('');
    setUser(null);
  };

  const startImpersonation = useCallback(async (targetUserId) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/admin/impersonate/${targetUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Impersonation failed');
    }

    const data = await response.json();

    // Save admin token securely in sessionStorage
    sessionStorage.setItem('admin_token', token);
    sessionStorage.setItem('admin_name', user?.name || 'Admin');
    sessionStorage.setItem('impersonation_log_id', data.impersonation_log_id);

    // Switch to impersonated user token
    localStorage.setItem('auth_token', data.access_token);
    setUser(data.user);
    setImpersonating(true);
    setImpersonationLogId(data.impersonation_log_id);
    setAdminName(user?.name || 'Admin');

    return data.user;
  }, [user]);

  const stopImpersonation = useCallback(async () => {
    const adminToken = sessionStorage.getItem('admin_token');
    const logId = sessionStorage.getItem('impersonation_log_id');

    // End impersonation on server
    try {
      const currentToken = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/api/admin/stop-impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ log_id: logId })
      });
    } catch (error) {
      console.error('Stop impersonation log error:', error);
    }

    // Restore admin token
    if (adminToken) {
      localStorage.setItem('auth_token', adminToken);
    }

    // Clear impersonation state
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_name');
    sessionStorage.removeItem('impersonation_log_id');
    setImpersonating(false);
    setImpersonationLogId(null);
    setAdminName('');

    // Reload admin user profile
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        credentials: 'include'
      });
      if (response.ok) {
        const adminUser = await response.json();
        setUser(adminUser);
      }
    } catch (error) {
      console.error('Failed to restore admin session:', error);
    }
  }, []);

  // Helper function to get auth headers for API calls
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithGoogle,
      processGoogleSession,
      logout,
      checkAuth,
      getAuthHeaders,
      impersonating,
      adminName,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
