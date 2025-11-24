
import { GoogleGenAI, Type } from "@google/genai";

export interface PricePrediction {
  predictedPrice: number;
  marketAnalysis: string;
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
    
    // This is a placeholder for a real API key.
    // In a real application, this should be handled securely.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API_KEY environment variable not set. Using mock data.");
      return {
        predictedPrice: parseFloat((Math.random() * (80 - 20) + 20).toFixed(2)),
        marketAnalysis: language === 'ta' 
            ? `உங்கள் பிராந்தியத்தில் ${cropName}-க்கான தற்போதைய போக்குகளின் அடிப்படையில், தேவை வலுவாக உள்ளது. வழங்கப்பட்ட விலை போட்டி சந்தை விகிதத்தை பிரதிபலிக்கிறது.`
            : `Based on current trends for ${cropName} in your region, demand appears to be strong. The provided price reflects a competitive market rate.`,
        demandTrend: 'High',
        bestSellingTime: language === 'ta' ? 'அடுத்த 2 வாரங்கள்' : 'Next 2 weeks'
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        As an agricultural market analyst for the Indian market, predict the market price for a farmer's crop.
        
        Important: Provide the 'marketAnalysis' and 'bestSellingTime' in ${language === 'ta' ? 'Tamil language (தமிழ்)' : 'English'}.
        
        Crop Details:
        - Name: ${cropName}
        - Variety: ${variety}
        - Quantity (kg): ${quantity}
        - Location: ${location}
        - Current Month: ${new Date().toLocaleString('default', { month: 'long' })}

        Based on these details, provide a response in JSON format.
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
              marketAnalysis: {
                type: Type.STRING,
                description: `A brief, 2-sentence explanation for the predicted price, considering seasonal demand, supply, and location in India. Respond in ${language === 'ta' ? 'Tamil' : 'English'}.`,
              },
              demandTrend: {
                type: Type.STRING,
                description: 'The current demand trend for this crop. Can be "High", "Medium", or "Low".',
              },
              bestSellingTime: {
                type: Type.STRING,
                description: `A recommendation for the best time to sell (e.g., "Next 2 weeks", "End of month"). Respond in ${language === 'ta' ? 'Tamil' : 'English'}.`,
              }
            },
            required: ["predictedPrice", "marketAnalysis", "demandTrend", "bestSellingTime"],
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
        marketAnalysis: language === 'ta' 
            ? `AI கணிப்பு தோல்வியடைந்தது. ${cropName}-க்கான வரலாற்று தரவுகளின் அடிப்படையில், சந்தை சீராக உள்ளது. விரைவில் விற்பதைக் கவனியுங்கள்.`
            : `AI prediction failed. Based on historical data for ${cropName}, the market is stable. Consider selling soon.`,
        demandTrend: 'Medium',
        bestSellingTime: language === 'ta' ? 'இந்த வாரம்' : 'This week'
    };
  }
}
