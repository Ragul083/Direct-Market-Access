import { Router, Request, Response } from 'express';
import {
  runEconometricPricingAlgorithm,
  generateCommodityTrendData,
  COMMODITY_BENCHMARKS,
  PredictionInput,
} from '../algorithms/agriculturalEconomics';
import { explainPredictionWithAI } from '../algorithms/xaiExplainer';

export const predictionRouter = Router();

/**
 * POST /api/predict
 * Complete pricing prediction and Explainable AI (XAI) factors attribution
 */
predictionRouter.post('/predict', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cropName, variety, quantity, location, language } = req.body;

    if (!cropName) {
      res.status(400).json({ error: 'cropName is required.' });
      return;
    }

    const input: PredictionInput = {
      cropName: String(cropName),
      variety: String(variety || 'Standard'),
      quantity: Number(quantity) || 500,
      location: String(location || 'Tamil Nadu'),
      language: String(language || 'en'),
    };

    // 1. Run Econometric Pricing Algorithm (Hedonic regression + seasonal decomposition + Shapley values)
    const quantitativeOutput = runEconometricPricingAlgorithm(input);

    // 2. Run Explainable AI (XAI) Explainer (Gemini 3.8 Flash with structured schema + fallback)
    const completeOutput = await explainPredictionWithAI(input, quantitativeOutput);

    res.json({
      success: true,
      data: completeOutput,
    });
  } catch (error: any) {
    console.error('Error during price prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compute price prediction and explanation',
      message: error?.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/trends
 * Retrieve 12-month historical and forecasted price trend data
 */
predictionRouter.get('/trends', (req: Request, res: Response): void => {
  try {
    const crop = String(req.query.crop || 'Onions');
    const location = String(req.query.location || 'Tamil Nadu');

    const trends = generateCommodityTrendData(crop, location);
    res.json({
      success: true,
      crop,
      location,
      data: trends,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/crops
 * Retrieve list of supported benchmark crops and market indices
 */
predictionRouter.get('/crops', (_req: Request, res: Response): void => {
  const cropsList = Object.entries(COMMODITY_BENCHMARKS).map(([name, data]) => ({
    name,
    category: data.category,
    baseMandiPrice: data.baseMandiPrice,
    perishabilityDays: data.perishabilityDays,
    volatilityIndex: data.volatilityIndex,
    varieties: Object.keys(data.varietyFactors).filter((v) => v !== 'Default'),
    mspPrice: data.mspPrice || null,
  }));

  res.json({
    success: true,
    data: cropsList,
  });
});

/**
 * GET /api/health
 */
predictionRouter.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    system: 'Farmlink Econometric & XAI Engine',
    model: 'gemini-3.8-flash',
    uptime: process.uptime(),
  });
});
