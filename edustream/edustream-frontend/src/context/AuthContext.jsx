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
          return userAPI.getMyProfile();
        })
        .then(({ data }) => setProfile(data.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    try {
      const profData = await userAPI.getMyProfile();
      setProfile(profData.data.data);
    } catch(e) {}
    return data.data.user;
  };

  const logout = async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, profile, setProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
