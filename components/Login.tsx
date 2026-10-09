
import React, { useState } from 'react';
import { User } from '../types';
import { mockUsers } from '../services/mockData';
import { apiService } from '../services/apiService';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginProps {
  onLogin: (user: User) => void;
  showSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, showSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate against Python backend
      const res = await apiService.login(email, password);
      if (res.success && res.user) {
        onLogin(res.user);
        return;
      }
    } catch (err) {
      console.warn('Python login attempt fallback:', err);
    } finally {
      setLoading(false);
    }

    // Local fallback
    const user = mockUsers.find(u => u.email === email);
    if (user && user.password === password) {
      onLogin(user);
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="auth-screen flex items-center justify-center min-h-screen bg-gray-50 relative">
      <div className="absolute top-4 right-4">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
        >
          <option value="en">English</option>
          <option value="ta">தமிழ் (Tamil)</option>
        </select>
      </div>
      <div className="auth-card w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
            <i className="fas fa-leaf text-5xl text-green-600"></i>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">{t('app.name')}</h1>
            <p className="mt-2 text-sm text-gray-600">{t('app.tagline')}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">{t('login.email')}</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                placeholder={t('login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{t('login.password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div className="flex items-center justify-between">
            <a href="#" className="text-sm font-medium text-green-600 hover:text-green-500">
              {t('login.forgot_password')}
            </a>
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300"
            >
              {t('login.signin')}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          {t('login.not_member')}{' '}
          <button onClick={showSignup} className="font-medium text-green-600 hover:text-green-500">
            {t('login.signup')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
