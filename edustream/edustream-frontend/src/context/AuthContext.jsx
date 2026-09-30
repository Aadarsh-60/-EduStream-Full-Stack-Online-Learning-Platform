import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // App load pe existing token check karo
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authAPI.getMe()
        .then(({ data }) => {
          setUser(data.data);
          // Catch profile errors separately so we don't log out if profile fails
          return userAPI.getMyProfile().catch(() => ({ data: { data: null } }));
        })
        .then(({ data }) => {
          if (data?.data) setProfile(data.data);
        })
        .catch((err) => {
          console.error("Auth init failed:", err);
          localStorage.removeItem('accessToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    if (data.data?.mfaRequired) {
      return data.data; // { mfaRequired: true, mfaSessionToken, email }
    }
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    try {
      const profData = await userAPI.getMyProfile();
      setProfile(profData.data.data);
    } catch(e) {}
    return data.data.user;
  };

  const complete2FALogin = async ({ mfaSessionToken, code, isRecoveryCode }) => {
    const { data } = await authAPI.verify2FA({ mfaSessionToken, code, isRecoveryCode });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    try {
      const profData = await userAPI.getMyProfile();
      setProfile(profData.data.data);
    } catch(e) {}
    return data.data.user;
  };

  const setAuthSession = async (accessToken, userData) => {
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
    try {
      const profData = await userAPI.getMyProfile();
      setProfile(profData.data.data);
    } catch(e) {}
  };

  const logout = async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, profile, setProfile, loading, login, complete2FALogin, setAuthSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
