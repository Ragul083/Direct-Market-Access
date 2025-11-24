
import React, { useState, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, ChartDataPoint, Crop } from '../types';
import { getHistoricalPriceData, addCrop, mockCrops } from '../services/mockData';
import { getAIPricePrediction, PricePrediction } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface FarmerDashboardProps {
  user: User;
}

const StatCard: React.FC<{ icon: string; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
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


const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ user }) => {
  // Prediction State
  const [cropName, setCropName] = useState('Onions');
  const [variety, setVariety] = useState('Red');
  const [quantity, setQuantity] = useState(500);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(getHistoricalPriceData('Onions'));
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upload State
  const [uploadName, setUploadName] = useState('');
  const [uploadVariety, setUploadVariety] = useState('');
  const [uploadQuantity, setUploadQuantity] = useState('');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadLocation, setUploadLocation] = useState(user.location);
  const [uploadImage, setUploadImage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // Listings State
  const [myCrops, setMyCrops] = useState<Crop[]>([]);

  const { t, language } = useLanguage();

  useEffect(() => {
    // Initialize my crops
    setMyCrops(mockCrops.filter(c => c.farmerId === user.id));
  }, [user.id]);

  const handlePrediction = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPrediction(null);
    const result = await getAIPricePrediction(cropName, variety, quantity, user.location, language);
    setPrediction(result);
    setChartData(getHistoricalPriceData(cropName));
    setIsLoading(false);
  }, [cropName, variety, quantity, user.location, language]);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSuccess('');
    
    const newCrop = addCrop({
        farmerId: user.id,
        farmerName: user.name,
        name: uploadName,
        variety: uploadVariety,
        quantity: Number(uploadQuantity),
        expectedPrice: Number(uploadPrice),
        imageUrl: uploadImage || 'https://picsum.photos/400/300', // Default image if empty
        location: uploadLocation
    });

    setMyCrops(prev => [...prev, newCrop]);
    setUploadSuccess(t('farmer.upload.success'));
    
    // Clear form
    setUploadName('');
    setUploadVariety('');
    setUploadQuantity('');
    setUploadPrice('');
    setUploadImage('');
    
    // Clear success message after 3 seconds
    setTimeout(() => setUploadSuccess(''), 3000);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="fa-rupee-sign" title={t('farmer.stats.predicted_price')} value={prediction ? `₹${prediction.predictedPrice}/kg` : 'N/A'} color="bg-green-500" />
        <StatCard icon="fa-chart-line" title={t('farmer.stats.demand_trend')} value={prediction?.demandTrend || 'N/A'} color="bg-blue-500" />
        <StatCard icon="fa-clock" title={t('farmer.stats.best_time')} value={prediction?.bestSellingTime || 'N/A'} color="bg-orange-500" />
        <StatCard icon="fa-seedling" title={t('farmer.stats.listings')} value={myCrops.length.toString()} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Prediction Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{t('farmer.ai_title')}</h3>
          <form onSubmit={handlePrediction} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">{t('farmer.crop_name')}</label>
              <input type="text" value={cropName} onChange={e => setCropName(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('farmer.variety')}</label>
              <input type="text" value={variety} onChange={e => setVariety(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('farmer.quantity')}</label>
              <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-300 flex items-center justify-center">
              {isLoading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-brain mr-2"></i>}
              {isLoading ? t('farmer.analyzing') : t('farmer.get_prediction')}
            </button>
          </form>
          {prediction && !isLoading && (
            <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                <h4 className="font-bold text-orange-800">{t('farmer.analysis_title')}</h4>
                <p className="text-sm text-orange-700 mt-1">{prediction.marketAnalysis}</p>
            </div>
          )}
        </div>

        {/* Price Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{cropName} - {t('farmer.chart_title')}</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value}`} />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#F97316" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Upload and Listings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{t('farmer.upload.title')}</h3>
            {uploadSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">{uploadSuccess}</div>}
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-600">{t('farmer.crop_name')}</label>
                    <input type="text" required value={uploadName} onChange={e => setUploadName(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600">{t('farmer.variety')}</label>
                    <input type="text" required value={uploadVariety} onChange={e => setUploadVariety(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600">{t('farmer.quantity')}</label>
                    <input type="number" required value={uploadQuantity} onChange={e => setUploadQuantity(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-600">{t('farmer.upload.expected_price')}</label>
                    <input type="number" required value={uploadPrice} onChange={e => setUploadPrice(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
                </div>
                 <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">{t('farmer.upload.location')}</label>
                    <input type="text" required value={uploadLocation} onChange={e => setUploadLocation(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
                </div>
                 <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">{t('farmer.upload.image_url')}</label>
                    <input type="text" value={uploadImage} onChange={e => setUploadImage(e.target.value)} placeholder="https://..." className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"/>
                </div>
                <div className="md:col-span-2">
                    <button type="submit" className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition-colors">
                        <i className="fas fa-cloud-upload-alt mr-2"></i> {t('farmer.upload.submit')}
                    </button>
                </div>
            </form>
        </div>
        
        {/* My Listings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{t('farmer.my_crops')}</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {myCrops.length > 0 ? (
                    myCrops.map(crop => (
                        <div key={crop.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                            <img src={crop.imageUrl} alt={crop.name} className="w-16 h-16 object-cover rounded-md" />
                            <div className="ml-4 flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold text-gray-800">{crop.name} <span className="text-sm font-normal text-gray-500">({crop.variety})</span></h4>
                                    <span className="text-green-600 font-bold">₹{crop.expectedPrice}/kg</span>
                                </div>
                                <div className="flex justify-between mt-1 text-sm text-gray-600">
                                    <span>Qty: {crop.quantity}kg</span>
                                    <span>{new Date(crop.uploadDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">{t('farmer.no_crops')}</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
