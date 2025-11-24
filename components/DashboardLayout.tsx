
import React, { ReactNode, useState, useEffect } from 'react';
import { User } from '../types';
import ChatWidget from './ChatWidget';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';

type ActiveView = 'dashboard' | 'profile' | 'notifications';

interface DashboardLayoutProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  unreadNotificationsCount: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout, children, activeView, setActiveView, unreadNotificationsCount }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { targetUserId, openChatWith } = useChat();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    if (targetUserId) {
      setIsChatOpen(true);
    }
  }, [targetUserId]);

  const handleCloseChat = () => {
    setIsChatOpen(false);
    openChatWith(null); // Clear the target user from context
  };


  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 text-center border-b">
          <i className="fas fa-leaf text-4xl text-orange-500"></i>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">{t('app.name')}</h2>
          <p className="text-xs text-gray-500 uppercase">{user.role}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('dashboard'); }} className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeView === 'dashboard' ? 'text-gray-800 bg-orange-100 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
            <i className={`fas fa-tachometer-alt w-6 ${activeView === 'dashboard' ? 'text-orange-600' : 'text-gray-400'}`}></i>
            <span className="ml-3">{t('dashboard.menu.dashboard')}</span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('profile'); }} className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeView === 'profile' ? 'text-gray-800 bg-orange-100 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
            <i className={`fas fa-user-circle w-6 ${activeView === 'profile' ? 'text-orange-600' : 'text-gray-400'}`}></i>
            <span className="ml-3">{t('dashboard.menu.profile')}</span>
          </a>
           <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('notifications'); }} className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeView === 'notifications' ? 'text-gray-800 bg-orange-100 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
            <i className={`fas fa-bell w-6 ${activeView === 'notifications' ? 'text-orange-600' : 'text-gray-400'}`}></i>
            <span className="ml-3">{t('dashboard.menu.notifications')}</span>
            {unreadNotificationsCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">{unreadNotificationsCount}</span>
            )}
          </a>
        </nav>
        <div className="p-4 border-t">
          <button onClick={onLogout} className="w-full flex items-center px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg">
            <i className="fas fa-sign-out-alt w-6"></i>
            <span className="ml-3">{t('dashboard.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 bg-white border-b">
          <h1 className="text-xl font-semibold text-gray-700">{t('dashboard.welcome')}, {user.name}</h1>
          <div className="flex items-center space-x-6">
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2"
            >
                <option value="en">English</option>
                <option value="ta">தமிழ்</option>
            </select>
             <div className="relative">
                <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 w-64 border rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
             </div>
             <button onClick={() => setActiveView('notifications')} className="relative text-gray-500 hover:text-orange-600 focus:outline-none">
                <i className="fas fa-bell text-2xl"></i>
                 {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 block h-4 w-4 text-xs flex items-center justify-center rounded-full bg-red-500 text-white">{unreadNotificationsCount}</span>
                )}
             </button>
             <button onClick={() => setIsChatOpen(!isChatOpen)} className="relative text-gray-500 hover:text-green-600 focus:outline-none">
                <i className="fas fa-comments text-2xl"></i>
             </button>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>
      
      <ChatWidget
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        currentUser={user}
        initialTargetUserId={targetUserId}
      />
    </div>
  );
};

export default DashboardLayout;
