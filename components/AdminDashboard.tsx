
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { mockUsers, verifyUser, deleteUser } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';

interface AdminDashboardProps {
  user: User;
}

const StatCard: React.FC<{ icon: string; title: string; value: number; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            <i className={`fas ${icon} text-white text-xl`}></i>
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
    const [users, setUsers] = useState<User[]>(mockUsers);
    const { t } = useLanguage();

    const handleToggleVerification = (userId: string) => {
        verifyUser(userId);
        setUsers([...mockUsers]); // Refresh state from the updated mockData
    };

    const handleRemoveUser = (userId: string) => {
        deleteUser(userId);
        setUsers([...mockUsers]); // Refresh state from the updated mockData
    };

    const totalFarmers = users.filter(u => u.role === UserRole.FARMER).length;
    const totalBuyers = users.filter(u => u.role === UserRole.BUYER).length;
    const pendingVerifications = users.filter(u => u.role === UserRole.FARMER && !u.verified).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="fa-users" title={t('admin.stats.total_users')} value={users.length} color="bg-blue-500" />
                <StatCard icon="fa-seedling" title={t('admin.stats.farmers')} value={totalFarmers} color="bg-green-500" />
                <StatCard icon="fa-shopping-cart" title={t('admin.stats.buyers')} value={totalBuyers} color="bg-purple-500" />
                <StatCard icon="fa-user-check" title={t('admin.stats.pending')} value={pendingVerifications} color="bg-orange-500" />
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{t('admin.user_management')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('admin.table.name')}</th>
                                <th scope="col" className="px-6 py-3">{t('admin.table.email')}</th>
                                <th scope="col" className="px-6 py-3">{t('admin.table.role')}</th>
                                <th scope="col" className="px-6 py-3">{t('admin.table.status')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('admin.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{u.name}</td>
                                    <td className="px-6 py-4">{u.email}</td>
                                    <td className="px-6 py-4">{u.role}</td>
                                    <td className="px-6 py-4">
                                        {u.role === UserRole.FARMER ? (
                                            u.verified ? 
                                            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Verified</span> : 
                                            <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">Pending</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center space-x-2">
                                        {u.role === UserRole.FARMER && !u.verified && (
                                            <button onClick={() => handleToggleVerification(u.id)} className="font-medium text-green-600 hover:underline">{t('admin.approve')}</button>
                                        )}
                                        {u.id !== user.id && <button onClick={() => handleRemoveUser(u.id)} className="font-medium text-red-600 hover:underline">{t('admin.remove')}</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
