
import React, { useState, useMemo } from 'react';
import { User, Crop } from '../types';
import { mockCrops } from '../services/mockData';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';

interface BuyerDashboardProps {
  user: User;
}

const CropCard: React.FC<{ crop: Crop; onContact: (farmerId: string) => void; contactText: string }> = ({ crop, onContact, contactText }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
        <img src={crop.imageUrl} alt={crop.name} className="w-full h-40 object-cover"/>
        <div className="p-4">
            <h3 className="text-lg font-bold text-gray-800">{crop.name} <span className="text-sm font-normal text-gray-500">({crop.variety})</span></h3>
            <p className="text-sm text-gray-600 mt-1"><i className="fas fa-user-tag mr-2 text-green-500"></i>{crop.farmerName}</p>
            <p className="text-sm text-gray-600"><i className="fas fa-map-marker-alt mr-2 text-green-500"></i>{crop.location}</p>
            <div className="flex justify-between items-center mt-4">
                <div>
                    <p className="text-xl font-bold text-green-600">₹{crop.expectedPrice}<span className="text-xs font-normal text-gray-500">/kg</span></p>
                    <p className="text-xs text-gray-500">{crop.quantity} kg available</p>
                </div>
                <button 
                    onClick={() => onContact(crop.farmerId)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                    {contactText}
                </button>
            </div>
        </div>
    </div>
);

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const { openChatWith } = useChat();
  const { t } = useLanguage();

  const uniqueLocations = useMemo(() => [...new Set(mockCrops.map(c => c.location))], []);

  const filteredCrops = useMemo(() => {
    return mockCrops.filter(crop => {
        const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) || crop.variety.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = locationFilter ? crop.location === locationFilter : true;
        return matchesSearch && matchesLocation;
    });
  }, [searchTerm, locationFilter]);
  
  const handleContactFarmer = (farmerId: string) => {
    openChatWith(farmerId);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full md:w-auto">
          <input 
            type="text" 
            placeholder={t('buyer.search_placeholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
        <div className="relative flex-grow w-full md:w-auto">
            <select 
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-full bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
                <option value="">{t('buyer.all_locations')}</option>
                {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCrops.length > 0 ? (
            filteredCrops.map(crop => <CropCard key={crop.id} crop={crop} onContact={handleContactFarmer} contactText={t('buyer.contact_farmer')} />)
        ) : (
            <p className="text-gray-500 col-span-full text-center">{t('buyer.no_crops')}</p>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
