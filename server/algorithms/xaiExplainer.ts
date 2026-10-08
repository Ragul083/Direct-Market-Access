/**
 * Explainable AI (XAI) Explanation Engine
 * Combines:
 * 1. Quantitative Shapley Feature Attributions from Econometric Models
 * 2. Generative Explainable AI via Gemini 3.8 Flash (@google/genai)
 * 3. Deterministic Algorithmic Fallback for High Availability
 * 4. Multi-language (English / Tamil) Localization
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  QuantitativePrediction,
  PredictionInput,
} from './agriculturalEconomics';

export interface ExplanationFactors {
  weather: string;
  production: string;
  market: string;
  location: string;
}

export interface CompletePredictionResponse {
  predictedPrice: number;
  minPrice: number;
  maxPrice: number;
  baselinePrice: number;
  demandTrend: 'High' | 'Medium' | 'Low';
  bestSellingTime: string;
  volatility: 'Low' | 'Medium' | 'High';
  factors: ExplanationFactors;
  attributions: {
    featureName: string;
    contributionINR: number;
    contributionPercentage: number;
    direction: 'increase' | 'decrease' | 'neutral';
    explanation: string;
  }[];
  strategicAdvice: string;
}

/**
 * Deterministic Algorithmic Explanation Generator (Rule-based XAI)
 * Used when offline or without Gemini API key, ensuring complete explainability.
 */
function generateDeterministicExplanation(
  input: PredictionInput,
  quant: QuantitativePrediction,
  lang: string
): { factors: ExplanationFactors; strategicAdvice: string } {
  const isTamil = lang === 'ta';
  const crop = input.cropName;
  const state = input.location;
  const price = quant.predictedPrice;

  if (isTamil) {
    const weatherFactor =
      quant.metrics.weatherRiskFactorINR >= 0
        ? `${state}-இல் தற்போதைய பருவமழை சீராக உள்ளது. ஈரப்பதம் பயிர் வளர்ச்சிக்கு சாதகமாக உள்ளதால் தரம் மேம்பட்டுள்ளது.`
        : `${state}-இல் சமீபத்திய மழைப்பொழிவு மற்றும் தட்பவெப்பநிலை காரணமாக ஈரப்பதம் அதிகரித்துள்ளது; விரைவாக விற்பனை செய்வது நல்லது.`;

    const productionFactor =
      quant.metrics.seasonalityMultiplier >= 1.05
        ? `தற்போதைய பருவத்தில் ${crop} மொத்த வரத்து மிதமாக உள்ளது. தேவைக்கு ஏற்ப உற்பத்தி சீராக உள்ளதால் விலை ₹${price}/கிலோ வரை உயர்கிறது.`
        : `மண்டிகளில் புதிய பயிர் வரத்து அதிகரித்து வருகிறது. ${input.quantity} கிலோ அளவுக்கான மொத்த கொள்முதல் சாத்தியம் உள்ளது.`;

    const marketFactor =
      quant.demandTrend === 'High'
        ? `சில்லறை மற்றும் மொத்த சந்தைகளில் வாங்குபவர்களின் தேவை மிக அதிகமாக உள்ளது. பண்டிகை மற்றும் நுகர்வு தேவைகள் விலையை ஆதரிக்கின்றன.`
        : `சந்தை தேவை சீராக உள்ளது; மொத்த வியாபாரிகள் போட்டி விலையில் கொள்முதல் செய்ய ஆர்வமாக உள்ளனர்.`;

    const locationFactor = `${state} மண்டி நிலவரப்படி, போக்குவரத்து மற்றும் உள்ளூர் விநியோக மையங்களின் தேவை ₹${quant.metrics.locationLogisticsSpreadINR > 0 ? '+' : ''}${quant.metrics.locationLogisticsSpreadINR} மாற்றத்தை ஏற்படுத்தியுள்ளது.`;

    const strategicAdvice = `பரிந்துரை: சிறந்த லாபத்தைப் பெற ${quant.bestSellingTime} காலத்திற்குள் விற்பனை செய்யவும். தரமான தரம் பிரித்தல் மூலம் கூடுதல் விலை பெறலாம்.`;

    return {
      factors: {
        weather: weatherFactor,
        production: productionFactor,
        market: marketFactor,
        location: locationFactor,
      },
      strategicAdvice,
    };
  }

  // English deterministic XAI
  const weatherFactor =
    quant.metrics.weatherRiskFactorINR >= 0
      ? `Current weather patterns and temperature stability in ${state} have maintained excellent produce quality with minimal harvest damage.`
      : `Recent humidity and precipitation in ${state} warrant swift mandi dispatch to avoid storage moisture degradation.`;

  const productionFactor =
    quant.metrics.seasonalityMultiplier >= 1.05
      ? `Arrival volumes for ${crop} are in a supply tightening phase before next harvest arrivals, creating favorable spot rate conditions.`
      : `Mandi arrival volumes are steady with moderate fresh harvest inflows across primary APMC collection centers.`;

  const marketFactor =
    quant.demandTrend === 'High'
      ? `Procurement demand across terminal mandis and institutional buyers is elevated, sustaining strong bid spreads.`
      : `Wholesale market absorption is stable, supporting an equitable clearing price around ₹${price}/kg.`;

  const locationFactor = `Regional mandi routing in ${state} provides efficient aggregation logistics with a net regional spread of ₹${quant.metrics.locationLogisticsSpreadINR >= 0 ? '+' : ''}${quant.metrics.locationLogisticsSpreadINR}/kg.`;

  const strategicAdvice = `Pricing Strategy: Target your sale within "${quant.bestSellingTime}" to capture maximum spot liquidity and avoid seasonal harvest influx.`;

  return {
    factors: {
      weather: weatherFactor,
      production: productionFactor,
      market: marketFactor,
      location: locationFactor,
    },
    strategicAdvice,
  };
}

/**
 * Generative XAI Explanation using Gemini 3.8 Flash with Econometric Grounding
 */
export async function explainPredictionWithAI(
  input: PredictionInput,
  quant: QuantitativePrediction
): Promise<CompletePredictionResponse> {
  const lang = input.language === 'ta' ? 'ta' : 'en';
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  // If no Gemini key is configured, seamlessly return high-precision econometric XAI
  if (!apiKey) {
    const fallback = generateDeterministicExplanation(input, quant, lang);
    return {
      predictedPrice: quant.predictedPrice,
      minPrice: quant.minPrice,
      maxPrice: quant.maxPrice,
      baselinePrice: quant.baselinePrice,
      demandTrend: quant.demandTrend,
      bestSellingTime: quant.bestSellingTime,
      volatility: quant.volatility,
      factors: fallback.factors,
      attributions: quant.attributions,
      strategicAdvice: fallback.strategicAdvice,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert Agricultural Econometrician and Explainable AI (XAI) specialist for Indian APMC mandis.
Based on the following quantitatively calculated econometric parameters, generate an Explainable AI breakdown.

**Quantitative Pricing Model Output:**
- Commodity: ${input.cropName} (${input.variety || 'Standard'})
- Lot Quantity: ${input.quantity} kg
- Location / State: ${input.location}
- Baseline Mandi Benchmark: ₹${quant.baselinePrice}/kg
- Statistically Computed Predicted Modal Price: ₹${quant.predictedPrice}/kg (Expected 95% CI: ₹${quant.minPrice} - ₹${quant.maxPrice})
- Demand Trend: ${quant.demandTrend}
- Agrarian Seasonality Multiplier: ${quant.metrics.seasonalityMultiplier}x
- Variety Premium: ₹${quant.metrics.varietyAdjustmentINR}/kg
- Supply Volume Elasticity Effect: ₹${quant.metrics.supplyVolumeShockINR}/kg
- Regional Logistics & Demand Spread: ₹${quant.metrics.locationLogisticsSpreadINR}/kg
- Weather/Climate Risk Factor: ₹${quant.metrics.weatherRiskFactorINR}/kg

**Language Requirement:**
Return all text descriptions in ${lang === 'ta' ? 'Tamil (தமிழ்)' : 'English'}.

**Task:**
Provide a grounded, professional Explainable AI explanation for each factor:
1. weather: Realistic agronomic impact of prevailing climate and weather on crop quality and transit in ${input.location}.
2. production: Supply volume, harvest cycle, and crop availability insights.
3. market: Buyer demand velocity, mandi bids, and consumption center pull.
4. location: Logistics, APMC mandi proximity, and state-specific distribution factors.
5. strategicAdvice: Actionable advice for the farmer or buyer on negotiation, grading, and optimal sale timing.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            factors: {
              type: Type.OBJECT,
              properties: {
                weather: {
                  type: Type.STRING,
                  description: 'Agronomic and climate impact on crop pricing.',
                },
                production: {
                  type: Type.STRING,
                  description: 'Supply volume, harvest stage, and arrivals dynamics.',
                },
                market: {
                  type: Type.STRING,
                  description: 'Market demand, wholesale bids, and consumption pull.',
                },
                location: {
                  type: Type.STRING,
                  description: 'Mandi proximity and logistics efficiency.',
                },
              },
              required: ['weather', 'production', 'market', 'location'],
            },
            strategicAdvice: {
              type: Type.STRING,
              description: 'Actionable trading strategy for farmers and buyers.',
            },
          },
          required: ['factors', 'strategicAdvice'],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        predictedPrice: quant.predictedPrice,
        minPrice: quant.minPrice,
        maxPrice: quant.maxPrice,
        baselinePrice: quant.baselinePrice,
        demandTrend: quant.demandTrend,
        bestSellingTime: quant.bestSellingTime,
        volatility: quant.volatility,
        factors: parsed.factors,
        attributions: quant.attributions,
        strategicAdvice: parsed.strategicAdvice || '',
      };
    }
  } catch (err) {
    console.warn('Gemini API call encountered error, falling back to econometric XAI:', err);
  }

  // Graceful fallback to deterministic XAI
  const fallback = generateDeterministicExplanation(input, quant, lang);
  return {
    predictedPrice: quant.predictedPrice,
    minPrice: quant.minPrice,
    maxPrice: quant.maxPrice,
    baselinePrice: quant.baselinePrice,
    demandTrend: quant.demandTrend,
    bestSellingTime: quant.bestSellingTime,
    volatility: quant.volatility,
    factors: fallback.factors,
    attributions: quant.attributions,
    strategicAdvice: fallback.strategicAdvice,
  };
}
