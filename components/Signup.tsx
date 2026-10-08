
import React, { useState } from 'react';
import { UserRole } from '../types';
import { registerUser } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';

interface SignupProps {
  showLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ showLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FARMER);
  const [location, setLocation] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (!email.endsWith('@gmail.com')) {
        setError("Please use a valid @gmail.com address.");
        return;
    }

    // Aadhar validation: 12 digits, numeric only
    const aadharRegex = /^\d{12}$/;
    if (!aadharRegex.test(aadhar)) {
        setError(t('signup.aadhar_error'));
        return;
    }

    const result = registerUser({ name, email, password, role, location, aadharNumber: aadhar });

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        showLogin();
      }, 2000); // Redirect after 2 seconds
    } else {
      setError(result.message);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 relative">
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
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
            <i className="fas fa-leaf text-5xl text-green-600"></i>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">{t('signup.title')}</h1>
            <p className="mt-2 text-sm text-gray-600">{t('signup.subtitle')}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-600 text-center bg-green-50 p-3 rounded-lg">{success}</p>}
          <div className="space-y-4">
            <input
              type="text"
              required
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder={t('signup.name')}
              value={name}
              onChange={e => setName(e.target.value)}
            />
             <input
              type="text"
              required
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder={t('signup.aadhar')}
              value={aadhar}
              maxLength={12}
              onChange={e => {
                  // Only allow numbers
                  const val = e.target.value.replace(/\D/g, '');
                  setAadhar(val);
              }}
            />
            <input
              type="email"
              required
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder={t('login.email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder={t('login.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder={t('signup.confirm_password')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
             <input
              type="text"
              required
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder={t('signup.location')}
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
             <select 
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-3 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
             >
                <option value={UserRole.FARMER}>{t('signup.role.farmer')}</option>
                <option value={UserRole.BUYER}>{t('signup.role.buyer')}</option>
             </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={!!success}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 disabled:bg-green-300"
            >
              {t('signup.submit')}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          {t('signup.have_account')}{' '}
          <button onClick={showLogin} className="font-medium text-green-600 hover:text-green-500">
            {t('signup.signin')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
