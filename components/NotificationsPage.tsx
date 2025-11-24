
import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { mockNotifications, markNotificationRead, markAllNotificationsRead } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationsPageProps {
    user: User;
    onNotificationsUpdate: () => void;
}

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    switch (type) {
        case 'success':
            return <i className="fas fa-check-circle text-green-500"></i>;
        case 'warning':
            return <i className="fas fa-exclamation-triangle text-orange-500"></i>;
        case 'info':
        default:
            return <i className="fas fa-info-circle text-blue-500"></i>;
    }
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ user, onNotificationsUpdate }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { t } = useLanguage();

    useEffect(() => {
        // In a real app, this would be an API call
        const userNotifications = mockNotifications.filter(n => n.userId === user.id)
            .sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(userNotifications);
    }, [user.id, mockNotifications]); // Depend on mockNotifications so it updates if they change externally
    
    const handleMarkAsRead = (notificationId: string) => {
        markNotificationRead(notificationId);
        // Update local state to reflect UI change immediately
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
        onNotificationsUpdate(); // Trigger update in parent App to update badge
    };
    
    const handleMarkAllAsRead = () => {
        markAllNotificationsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        onNotificationsUpdate(); // Trigger update in parent App to update badge
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{t('notifications.title')}</h2>
                {notifications.some(n => !n.read) && (
                    <button onClick={handleMarkAllAsRead} className="text-sm font-medium text-green-600 hover:text-green-500">
                        {t('notifications.mark_all')}
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {notifications.length > 0 ? (
                    notifications.map(notification => (
                        <div 
                            key={notification.id} 
                            onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            className={`p-4 rounded-lg flex items-start gap-4 transition-colors duration-300 cursor-pointer ${notification.read ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 border-l-4 border-blue-50 hover:bg-blue-100'}`}
                        >
                            <div className="text-2xl pt-1">
                                <NotificationIcon type={notification.type} />
                            </div>
                            <div className="flex-1">
                                <p className={`font-medium ${!notification.read ? 'text-gray-800' : ''}`}>{notification.message}</p>
                                <p className="text-xs mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                            </div>
                            {!notification.read && (
                                <span className="text-xs font-medium text-blue-600">
                                    {t('notifications.mark_read')}
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">{t('notifications.empty')}</p>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
