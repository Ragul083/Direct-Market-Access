
import React, { useState, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, ChartDataPoint, Crop } from '../types';
import { getHistoricalPriceData, addCrop, mockCrops } from '../services/mockData';
import { getAIPricePrediction, PricePrediction } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { useLanguage } from '../contexts/LanguageContext';

interface FarmerDashboardProps {
  user: User;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry"
];

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
  const [predictionState, setPredictionState] = useState('Tamil Nadu');
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
    try {
      const [result, history] = await Promise.all([
        getAIPricePrediction(cropName, variety, quantity, predictionState, language),
        apiService.getCropHistory(cropName),
      ]);
      setPrediction(result);
      if (history && history.length > 0) {
        setChartData(history);
      } else {
        setChartData(getHistoricalPriceData(cropName));
      }
    } catch (err) {
      console.warn("Prediction error:", err);
      setChartData(getHistoricalPriceData(cropName));
    } finally {
      setIsLoading(false);
    }
  }, [cropName, variety, quantity, predictionState, language]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
        imageUrl: uploadImage, // Pass empty string or base64. Service handles undefined if needed.
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
             <div>
              <label className="text-sm font-medium text-gray-600">{t('farmer.prediction.state')}</label>
              <select 
                value={predictionState} 
                onChange={e => setPredictionState(e.target.value)} 
                className="mt-1 w-full p-2 border rounded-md bg-gray-50 focus:ring-green-500 focus:border-green-500"
              >
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-300 flex items-center justify-center">
              {isLoading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-brain mr-2"></i>}
              {isLoading ? t('farmer.analyzing') : t('farmer.get_prediction')}
            </button>
          </form>
          {prediction && !isLoading && (
            <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                <h4 className="font-bold text-orange-800 mb-3 flex items-center">
                    <i className="fas fa-lightbulb mr-2"></i> {t('farmer.analysis_title')}
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                         <i className="fas fa-cloud-sun text-blue-500 mt-1 mr-2 w-5"></i>
                         <span><strong>{t('farmer.factors.weather')}:</strong> {prediction.factors.weather}</span>
                    </li>
                    <li className="flex items-start">
                         <i className="fas fa-tractor text-green-500 mt-1 mr-2 w-5"></i>
                         <span><strong>{t('farmer.factors.production')}:</strong> {prediction.factors.production}</span>
                    </li>
                    <li className="flex items-start">
                         <i className="fas fa-chart-bar text-purple-500 mt-1 mr-2 w-5"></i>
                         <span><strong>{t('farmer.factors.market')}:</strong> {prediction.factors.market}</span>
                    </li>
                    <li className="flex items-start">
                         <i className="fas fa-map-marker-alt text-red-500 mt-1 mr-2 w-5"></i>
                         <span><strong>{t('farmer.factors.location')}:</strong> {prediction.factors.location}</span>
                    </li>
                </ul>
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
                    <label className="text-sm font-medium text-gray-600 block mb-1">{t('farmer.upload.image_label')}</label>
                    <div className="flex items-center space-x-4">
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors flex items-center justify-center w-full md:w-auto">
                             <i className="fas fa-camera mr-2"></i>
                             {uploadImage ? t('farmer.upload.change_image') : t('farmer.upload.select_image')}
                             <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                         {uploadImage && (
                            <div className="h-16 w-16 relative">
                                <img src={uploadImage} alt="Preview" className="h-full w-full object-cover rounded-md border" />
                            </div>
                        )}
                        {!uploadImage && (
                            <div className="h-16 w-16 bg-gray-100 rounded-md border flex items-center justify-center text-gray-400">
                                <i className="fas fa-image text-2xl"></i>
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 mt-2">
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
                            {crop.imageUrl ? (
                                <img src={crop.imageUrl} alt={crop.name} className="w-16 h-16 object-cover rounded-md" />
                            ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
                                    <i className="fas fa-leaf text-2xl"></i>
                                </div>
                            )}
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
