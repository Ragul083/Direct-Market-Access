
import React, { useState, useMemo } from 'react';
import { User, Crop } from '../types';
import { mockCrops, notifyUserOfInterest } from '../services/mockData';
import { chatService } from '../services/chatService';
import { getAIPricePrediction, PricePrediction } from '../services/geminiService';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';

interface BuyerDashboardProps {
  user: User;
}

interface CropCardProps {
    crop: Crop;
    onContact: (farmerId: string, cropName: string) => void;
    onAnalyze: (crop: Crop) => void;
    contactText: string;
    analyzeText: string;
}

const CropCard: React.FC<CropCardProps> = ({ crop, onContact, onAnalyze, contactText, analyzeText }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 border border-gray-100">
        <div className="p-6">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{crop.name}</h3>
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">{crop.variety}</span>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">₹{crop.expectedPrice}</p>
                    <p className="text-xs text-gray-500">per kg</p>
                </div>
            </div>
            
            <div className="space-y-2 mt-4 text-sm text-gray-600">
                <p className="flex items-center"><i className="fas fa-user-tag w-6 text-green-500"></i>{crop.farmerName}</p>
                <p className="flex items-center"><i className="fas fa-map-marker-alt w-6 text-green-500"></i>{crop.location}</p>
                <p className="flex items-center"><i className="fas fa-weight-hanging w-6 text-green-500"></i>{crop.quantity} kg available</p>
            </div>

            <div className="flex justify-between items-center mt-6 gap-2">
                <button 
                    onClick={() => onAnalyze(crop)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                    <i className="fas fa-magic mr-1"></i> {analyzeText}
                </button>
                <button 
                    onClick={() => onContact(crop.farmerId, crop.name)}
                    className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
                >
                    <i className="fas fa-envelope mr-1"></i> {contactText}
                </button>
            </div>
        </div>
    </div>
);

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  
  // Analysis Modal State
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  const { openChatWith } = useChat();
  const { t, language } = useLanguage();

  const uniqueLocations = useMemo(() => [...new Set(mockCrops.map(c => c.location))], []);

  const filteredCrops = useMemo(() => {
    return mockCrops.filter(crop => {
        const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) || crop.variety.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = locationFilter ? crop.location === locationFilter : true;
        return matchesSearch && matchesLocation;
    });
  }, [searchTerm, locationFilter]);
  
  const handleContactFarmer = async (farmerId: string, cropName: string) => {
    openChatWith(farmerId);
    notifyUserOfInterest(farmerId, user.name, cropName);
    const conversation = await chatService.startOrGetConversation(user.id, farmerId);
    await chatService.sendMessage(conversation.id, user.id, `Hello, I am interested in your ${cropName}. Is it still available?`);
  };

  const handleAnalyzeCrop = async (crop: Crop) => {
      setSelectedCrop(crop);
      setPrediction(null);
      setLoadingPrediction(true);
      
      const result = await getAIPricePrediction(crop.name, crop.variety, crop.quantity, crop.location, language);
      
      setPrediction(result);
      setLoadingPrediction(false);
  };

  const closeAnalysisModal = () => {
      setSelectedCrop(null);
      setPrediction(null);
  };

  return (
    <div className="space-y-6 relative">
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
            filteredCrops.map(crop => (
                <CropCard 
                    key={crop.id} 
                    crop={crop} 
                    onContact={handleContactFarmer} 
                    onAnalyze={handleAnalyzeCrop}
                    contactText={t('buyer.contact_farmer')} 
                    analyzeText={t('buyer.get_insight')}
                />
            ))
        ) : (
            <p className="text-gray-500 col-span-full text-center">{t('buyer.no_crops')}</p>
        )}
      </div>

      {/* Analysis Modal */}
      {selectedCrop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
                  <div className="p-5 border-b flex justify-between items-center bg-green-50 rounded-t-xl">
                      <div>
                          <h3 className="text-xl font-bold text-gray-800">{t('buyer.insight_title')}</h3>
                          <p className="text-sm text-gray-600">{selectedCrop.name} ({selectedCrop.variety})</p>
                      </div>
                      <button onClick={closeAnalysisModal} className="text-gray-500 hover:text-red-500 text-xl focus:outline-none">
                          <i className="fas fa-times"></i>
                      </button>
                  </div>
                  
                  <div className="p-6">
                      {loadingPrediction ? (
                          <div className="flex flex-col items-center justify-center py-10">
                              <i className="fas fa-circle-notch fa-spin text-4xl text-green-600 mb-4"></i>
                              <p className="text-gray-500 animate-pulse">{t('farmer.analyzing')}</p>
                          </div>
                      ) : prediction ? (
                          <div className="space-y-6">
                              {/* Price Comparison - Removed AI Price */}
                              <div className="flex justify-center mb-4">
                                  <div className="bg-gray-50 p-4 rounded-lg border text-center w-full max-w-xs">
                                      <p className="text-xs text-gray-500 mb-1">{t('buyer.asking_price')}</p>
                                      <p className="text-2xl font-bold text-gray-800">₹{selectedCrop.expectedPrice}</p>
                                  </div>
                              </div>

                              {/* Factors */}
                              <div>
                                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                                      <i className="fas fa-chart-pie mr-2 text-orange-500"></i> {t('farmer.analysis_title')}
                                  </h4>
                                  <ul className="space-y-3 text-sm text-gray-700">
                                      <li className="flex items-start bg-blue-50 p-3 rounded-md">
                                          <i className="fas fa-cloud-sun text-blue-500 mt-1 mr-3 w-5"></i>
                                          <div>
                                              <span className="font-semibold block text-blue-900">{t('farmer.factors.weather')}</span>
                                              <span>{prediction.factors.weather}</span>
                                          </div>
                                      </li>
                                      <li className="flex items-start bg-green-50 p-3 rounded-md">
                                          <i className="fas fa-tractor text-green-500 mt-1 mr-3 w-5"></i>
                                          <div>
                                              <span className="font-semibold block text-green-900">{t('farmer.factors.production')}</span>
                                              <span>{prediction.factors.production}</span>
                                          </div>
                                      </li>
                                      <li className="flex items-start bg-purple-50 p-3 rounded-md">
                                          <i className="fas fa-chart-bar text-purple-500 mt-1 mr-3 w-5"></i>
                                          <div>
                                              <span className="font-semibold block text-purple-900">{t('farmer.factors.market')}</span>
                                              <span>{prediction.factors.market}</span>
                                          </div>
                                      </li>
                                      <li className="flex items-start bg-red-50 p-3 rounded-md">
                                          <i className="fas fa-map-marker-alt text-red-500 mt-1 mr-3 w-5"></i>
                                          <div>
                                              <span className="font-semibold block text-red-900">{t('farmer.factors.location')}</span>
                                              <span>{prediction.factors.location}</span>
                                          </div>
                                      </li>
                                  </ul>
                              </div>
                              
                              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-sm">
                                  <span className="text-gray-600 font-medium">{t('farmer.stats.demand_trend')}:</span>
                                  <span className={`font-bold px-3 py-1 rounded-full ${prediction.demandTrend === 'High' ? 'bg-green-100 text-green-800' : prediction.demandTrend === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                      {prediction.demandTrend}
                                  </span>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center text-red-500">
                              <p>Failed to load insights. Please try again.</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-xl">
                      <button 
                          onClick={closeAnalysisModal}
                          className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                      >
                          {t('buyer.close')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
