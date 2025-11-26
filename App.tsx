
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Login from './components/Login';
import Signup from './components/Signup';
import FarmerDashboard from './components/FarmerDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import AdminDashboard from './components/AdminDashboard';
import DashboardLayout from './components/DashboardLayout';
import ProfilePage from './components/ProfilePage';
import NotificationsPage from './components/NotificationsPage';
import { ChatProvider } from './contexts/ChatContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { mockNotifications, updateUser as updateUserService, persistLoginSession, clearLoginSession, getPersistedSession } from './services/mockData';


type Page = 'login' | 'signup';
type ActiveView = 'dashboard' | 'profile' | 'notifications';


const App: React.FC = () => {
  // Initialize from session storage if available
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getPersistedSession();
  });
  
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [notificationUpdateTrigger, setNotificationUpdateTrigger] = useState(0); // Trigger re-render for notifications


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    persistLoginSession(user); // Save to local storage
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    clearLoginSession(); // Clear from local storage
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleUserUpdate = (updates: Partial<Pick<User, 'name' | 'location'>>) => {
      if (!currentUser) return;
      const updatedUser = updateUserService(currentUser.id, updates);
      if(updatedUser) {
          setCurrentUser(updatedUser);
      }
  };

  const refreshNotifications = () => {
    setNotificationUpdateTrigger(prev => prev + 1);
  };

  const renderDashboardContent = () => {
    if (!currentUser) return null;

    switch (activeView) {
      case 'profile':
        return <ProfilePage user={currentUser} onUserUpdate={handleUserUpdate} />;
      case 'notifications':
        return <NotificationsPage user={currentUser} onNotificationsUpdate={refreshNotifications} />;
      case 'dashboard':
      default:
        switch (currentUser.role) {
          case UserRole.FARMER:
            return <FarmerDashboard user={currentUser} />;
          case UserRole.BUYER:
            return <BuyerDashboard user={currentUser} />;
          case UserRole.ADMIN:
            return <AdminDashboard user={currentUser} />;
          default:
            return <div>Invalid user role.</div>;
        }
    }
  };

  const MainContent = () => {
      if (!currentUser) {
        if (currentPage === 'login') {
          return <Login onLogin={handleLogin} showSignup={() => setCurrentPage('signup')} />;
        }
        return <Signup showLogin={() => setCurrentPage('login')} />;
      }

      // Re-calculate unread count whenever render happens (triggered by notificationUpdateTrigger)
      const unreadNotificationsCount = mockNotifications.filter(n => n.userId === currentUser.id && !n.read).length;

      return (
        <ChatProvider>
          <DashboardLayout
            user={currentUser}
            onLogout={handleLogout}
            activeView={activeView}
            setActiveView={setActiveView}
            unreadNotificationsCount={unreadNotificationsCount}
          >
            {renderDashboardContent()}
          </DashboardLayout>
        </ChatProvider>
      );
  }

  return (
    <LanguageProvider>
        <MainContent />
    </LanguageProvider>
  );
};

export default App;
