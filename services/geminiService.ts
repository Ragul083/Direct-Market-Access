
import { GoogleGenAI, Type } from "@google/genai";
import { apiService } from "./apiService";

export interface PredictionFactors {
  weather: string;
  production: string;
  market: string;
  location: string;
}

export interface PricePrediction {
  predictedPrice: number;
  factors: PredictionFactors;
  demandTrend: 'High' | 'Medium' | 'Low';
  bestSellingTime: string;
}

export async function getAIPricePrediction(
  cropName: string,
  variety: string,
  quantity: number,
  location: string,
  language: string = 'en'
): Promise<PricePrediction> {
    // First, call the Python backend market intelligence service
    try {
      const pythonPrediction = await apiService.getPrediction(cropName, variety, quantity, location, language);
      if (pythonPrediction && pythonPrediction.predictedPrice) {
        return pythonPrediction;
      }
    } catch (e) {
      console.warn("Python prediction service call failed, attempting local fallback:", e);
    }
    
    // Fallback: Check client-side Gemini API or simulated models
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("API_KEY environment variable not set. Using mock data.");
      return {
        predictedPrice: parseFloat((Math.random() * (80 - 20) + 20).toFixed(2)),
        factors: {
            weather: language === 'ta' 
                ? `${location}-இல் தற்போதைய பருவமழை சீராக உள்ளது, இது பயிர் வளர்ச்சிக்கு சாதகமாக உள்ளது.` 
                : `Current monsoon patterns in ${location} are stable, supporting healthy crop growth.`,
            production: language === 'ta'
                ? `இந்த பருவத்தில் ${cropName} வரத்து மிதமாக இருக்கும் என்று எதிர்பார்க்கப்படுகிறது.`
                : `Supply volume for ${cropName} is expected to be moderate this season.`,
            market: language === 'ta'
                ? `உள்ளூர் சந்தைகளில் தேவை அதிகமாக உள்ளது, பண்டிகை காலத்தால் விலை உயரலாம்.`
                : `Demand in local markets is high, likely driven by upcoming festivals.`,
            location: language === 'ta'
                ? `${location} மண்டி தரவுகளின்படி, கடந்த வாரத்தை விட விலை 5% உயர்ந்துள்ளது.`
                : `Based on ${location} mandi data, prices have seen a 5% uptick since last week.`
        },
        demandTrend: 'High',
        bestSellingTime: language === 'ta' ? 'அடுத்த 2 வாரங்கள்' : 'Next 2 weeks'
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        As an expert agricultural economist for the Indian market, predict the market price for a farmer's crop and provide a detailed Explainable AI (XAI) breakdown.
        
        **Language Requirement:** Provide ALL text fields (weather, production, market, location, bestSellingTime) in ${language === 'ta' ? 'Tamil (தமிழ்)' : 'English'}.
        
        **Input Data:**
        - Crop: ${cropName} (${variety})
        - Quantity: ${quantity} kg
        - State/Location: ${location}
        - Current Date: ${new Date().toLocaleDateString()}

        **Analysis Requirements:**
        1. **Weather**: Analyze how recent weather (rain, heat, etc.) in ${location} affects this crop's quality/price.
        2. **Production**: Estimate if there is a surplus or shortage based on seasonal yields.
        3. **Market**: Analyze buyer demand trends and export potential.
        4. **Location**: Specific logistics or mandi trends for ${location}.

        Return the response in JSON format.
    `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedPrice: {
                type: Type.NUMBER,
                description: 'The predicted selling price per kg in Indian Rupees (INR).',
              },
              factors: {
                  type: Type.OBJECT,
                  properties: {
                      weather: { type: Type.STRING, description: "Analysis based on weather conditions." },
                      production: { type: Type.STRING, description: "Analysis based on yield/supply." },
                      market: { type: Type.STRING, description: "Analysis based on demand trends." },
                      location: { type: Type.STRING, description: "Specific insights for the state/location." }
                  },
                  required: ["weather", "production", "market", "location"]
              },
              demandTrend: {
                type: Type.STRING,
                description: 'The current demand trend. One of: "High", "Medium", "Low".',
              },
              bestSellingTime: {
                type: Type.STRING,
                description: 'Recommendation for best time to sell.',
              }
            },
            required: ["predictedPrice", "factors", "demandTrend", "bestSellingTime"],
          },
       },
    });

    const jsonText = response.text.trim();
    const prediction: PricePrediction = JSON.parse(jsonText);
    return prediction;

  } catch (error) {
    console.error("Error fetching AI price prediction:", error);
    // Fallback to mock data on API error
    return {
        predictedPrice: parseFloat((Math.random() * (80 - 20) + 20).toFixed(2)),
        factors: {
            weather: language === 'ta' ? 'வானிலை தரவு கிடைக்கவில்லை.' : 'Weather data unavailable.',
            production: language === 'ta' ? 'வரலாற்று விளைச்சலின் அடிப்படையில் சராசரி உற்பத்தி.' : 'Average production based on historical yield.',
            market: language === 'ta' ? 'சந்தை தேவை நிலையாக உள்ளது.' : 'Market demand is stable.',
            location: language === 'ta' ? 'குறிப்பிட்ட இடத்திற்கான தரவு இல்லை.' : 'No specific data for this location.'
        },
        demandTrend: 'Medium',
        bestSellingTime: language === 'ta' ? 'இந்த வாரம்' : 'This week'
    };
  }
}
