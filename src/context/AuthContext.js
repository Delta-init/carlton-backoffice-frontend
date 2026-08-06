import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonationLogId, setImpersonationLogId] = useState(null);
  const [adminName, setAdminName] = useState("");

  // Restore impersonation state on mount
  useEffect(() => {
    const savedAdmin = sessionStorage.getItem("admin_token");
    if (savedAdmin) {
      setImpersonating(true);
      setImpersonationLogId(
        sessionStorage.getItem("impersonation_log_id") || null,
      );
      setAdminName(sessionStorage.getItem("admin_name") || "Admin");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem("auth_token");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("auth_token");
      }
    } else {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }
    // Forced MFA enrollment (first login / after an admin reset)
    if (data.requires_setup) {
      return {
        requires_setup: true,
        mfa_setup_token: data.mfa_setup_token,
        email,
        message: data.message,
        user: data.user,
      };
    }

    // Check if 2FA is required
    if (data.requires_2fa) {
      return {
        requires_2fa: true,
        mfa_method: data.mfa_method || "email",
        email,
        message: data.message,
        user: data.user,
      };
    }

    localStorage.setItem("auth_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const verifyOtp = async (email, otpCode) => {
    const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_code: otpCode }),
      credentials: "include",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Verification failed");
    }

    localStorage.setItem("auth_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  // Start authenticator setup — during login (setupToken) or from Profile (JWT)
  const mfaSetup = async (setupToken) => {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`${API_URL}/api/auth/mfa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(setupToken ? {} : token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(setupToken ? { setup_token: setupToken } : {}),
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Setup failed");
    return data;
  };

  // Confirm an authenticator code — issues a JWT when done during login enrollment
  const mfaConfirm = async (setupToken, code) => {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`${API_URL}/api/auth/mfa/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(setupToken ? {} : token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(
        setupToken ? { setup_token: setupToken, code } : { code },
      ),
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Verification failed");
    if (data.access_token) {
      localStorage.setItem("auth_token", data.access_token);
      setUser(data.user);
      return data.user;
    }
    return data;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleSession = async (sessionId) => {
    const response = await fetch(`${API_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Google authentication failed");
    }

    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("auth_token");
    // Clear impersonation state on full logout
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_name");
    sessionStorage.removeItem("impersonation_log_id");
    setImpersonating(false);
    setImpersonationLogId(null);
    setAdminName("");
    setUser(null);
  };

  // Auto-logout on token expiry. Scheduled precisely for the token's exact expiry
  // moment (via decoded exp) rather than polling on a fixed interval, so it fires
  // the instant the token goes stale instead of up to a minute late. Re-checks on
  // tab focus too, since setTimeout can run late while a tab is backgrounded or the
  // machine is asleep - visibilitychange catches that the moment the tab is back.
  // A 60s interval remains as a pure safety net for anything those two miss.
  // Re-runs whenever `user` changes (login, logout, impersonation swap) so a fresh
  // token is always what gets scheduled, not a stale one from before the swap.
  useEffect(() => {
    let expiryTimer = null;

    const getExpiryMs = () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return null;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp ? payload.exp * 1000 : null;
      } catch {
        return null;
      }
    };

    const forceLogout = () => {
      if (!localStorage.getItem("auth_token")) return; // already logged out
      // window.location.href below is a full page reload, which tears down this
      // toast before it can ever render - stash the message for the login page
      // to show instead, once it's actually mounted.
      sessionStorage.setItem("auth_logout_reason", "Your session has expired. Please sign in again.");
      logout();
      window.location.href = "/login";
    };

    const scheduleCheck = () => {
      if (expiryTimer) { clearTimeout(expiryTimer); expiryTimer = null; }
      const expiresAt = getExpiryMs();
      if (!expiresAt) return;
      const msRemaining = expiresAt - Date.now();
      if (msRemaining <= 0) { forceLogout(); return; }
      // setTimeout's delay is a 32-bit int internally - anything past ~24 days
      // overflows and fires almost immediately, so cap it; the safety-net interval
      // below re-schedules well before a capped timer would under-fire.
      expiryTimer = setTimeout(forceLogout, Math.min(msRemaining, 2147000000));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleCheck();
    };

    // Cross-tab: if the token is cleared elsewhere (expiry there, or a manual
    // logout), mirror that here immediately instead of waiting for this tab's
    // own timer.
    const onStorage = (e) => {
      if (e.key === "auth_token" && !e.newValue) {
        setUser(null);
        if (window.location.pathname !== "/login") {
          sessionStorage.setItem("auth_logout_reason", "You were signed out in another tab.");
          window.location.href = "/login";
        }
      }
    };

    scheduleCheck();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);
    const safetyInterval = setInterval(scheduleCheck, 60000);

    return () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
      clearInterval(safetyInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startImpersonation = useCallback(
    async (targetUserId) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/api/admin/impersonate/${targetUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Impersonation failed");
      }

      const data = await response.json();

      // Save admin token securely in sessionStorage
      sessionStorage.setItem("admin_token", token);
      sessionStorage.setItem("admin_name", user?.name || "Admin");
      sessionStorage.setItem("impersonation_log_id", data.impersonation_log_id);

      // Switch to impersonated user token
      localStorage.setItem("auth_token", data.access_token);
      setUser(data.user);
      setImpersonating(true);
      setImpersonationLogId(data.impersonation_log_id);
      setAdminName(user?.name || "Admin");

      return data.user;
    },
    [user],
  );

  const stopImpersonation = useCallback(async () => {
    const adminToken = sessionStorage.getItem("admin_token");
    const logId = sessionStorage.getItem("impersonation_log_id");

    // End impersonation on server
    try {
      const currentToken = localStorage.getItem("auth_token");
      await fetch(`${API_URL}/api/admin/stop-impersonate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ log_id: logId }),
      });
    } catch (error) {
      console.error("Stop impersonation log error:", error);
    }

    // Restore admin token
    if (adminToken) {
      localStorage.setItem("auth_token", adminToken);
    }

    // Clear impersonation state
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_name");
    sessionStorage.removeItem("impersonation_log_id");
    setImpersonating(false);
    setImpersonationLogId(null);
    setAdminName("");

    // Reload admin user profile
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        credentials: "include",
      });
      if (response.ok) {
        const adminUser = await response.json();
        setUser(adminUser);
      }
    } catch (error) {
      console.error("Failed to restore admin session:", error);
    }
  }, []);

  // Helper function to get auth headers for API calls
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyOtp,
        mfaSetup,
        mfaConfirm,
        loginWithGoogle,
        processGoogleSession,
        logout,
        checkAuth,
        getAuthHeaders,
        impersonating,
        adminName,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
