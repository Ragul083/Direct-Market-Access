
import React, { useState } from 'react';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfilePageProps {
    user: User;
    onUserUpdate: (updates: Partial<Pick<User, 'name' | 'location'>>) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [location, setLocation] = useState(user.location);
    const [successMessage, setSuccessMessage] = useState('');
    const { t } = useLanguage();

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onUserUpdate({ name, location });
        setSuccessMessage(t('profile.success'));
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleCancel = () => {
        setName(user.name);
        setLocation(user.location);
        setIsEditing(false);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{t('profile.title')}</h2>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                        {t('profile.edit')}
                    </button>
                )}
            </div>

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{successMessage}</span>
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-gray-600">{t('signup.name')}</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!isEditing}
                            className="mt-1 w-full p-3 border rounded-md bg-gray-50 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600">{t('login.email')}</label>
                        <input 
                            type="email" 
                            value={user.email}
                            disabled
                            className="mt-1 w-full p-3 border rounded-md bg-gray-200 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600">{t('signup.location')}</label>
                         <input 
                            type="text" 
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            disabled={!isEditing}
                            className="mt-1 w-full p-3 border rounded-md bg-gray-50 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
                     <div>
                        <label className="text-sm font-bold text-gray-600">{t('admin.table.role')}</label>
                         <input 
                            type="text" 
                            value={user.role}
                            disabled
                            className="mt-1 w-full p-3 border rounded-md bg-gray-200 cursor-not-allowed"
                        />
                    </div>
                </div>

                {isEditing && (
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={handleCancel} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300">
                            {t('profile.cancel')}
                        </button>
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">
                            {t('profile.save')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default ProfilePage;
