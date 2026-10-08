"""
Explainable AI (XAI) Attribution & Explanation Engine (Python Implementation)
Combines:
1. Quantitative Shapley Feature Attributions from Econometric Models
2. Deterministic Algorithmic Rule-based Explanation Generator (High Reliability)
3. Gemini Generative AI Enhancement (when API_KEY/GEMINI_API_KEY is configured)
4. Full Multi-language Support (English & Tamil)
"""

import json
import os
import sys
import urllib.request
from typing import Dict, Any, Optional

from .agricultural_economics import (
    run_econometric_pricing_algorithm,
    COMMODITY_BENCHMARKS,
    STATE_LOGISTICS_PROFILE,
)


def generate_deterministic_explanation(
    crop_name: str,
    variety: str,
    quantity: float,
    location: str,
    quant: Dict[str, Any],
    lang: str = 'en'
) -> Dict[str, Any]:
    """
    Deterministic Algorithmic Explanation Generator (Rule-based XAI)
    Produces clear, explainable factors in Tamil or English based on econometric metrics.
    """
    is_tamil = lang == 'ta'
    crop = crop_name
    state = location
    price = quant['predictedPrice']
    metrics = quant['metrics']
    demand_trend = quant['demandTrend']
    best_selling_time = quant['bestSellingTime']

    if is_tamil:
        weather_factor = (
            f"{state}-இல் தற்போதைய பருவமழை மற்றும் வெப்பநிலை சீராக உள்ளது. "
            f"பயிர் வளர்ச்சிக்கு சாதகமாக உள்ளதால் தரம் மேம்பட்டுள்ளது."
            if metrics['weatherRiskFactorINR'] >= 0
            else f"{state}-இல் சமீபத்திய மழைப்பொழிவு மற்றும் தட்பவெப்பநிலை காரணமாக ஈரப்பதம் அதிகரித்துள்ளது; விரைவாக விற்பனை செய்வது நல்லது."
        )

        production_factor = (
            f"தற்போதைய பருவத்தில் {crop} ({variety}) மொத்த வரத்து மிதமாக உள்ளது. "
            f"தேவைக்கு ஏற்ப உற்பத்தி சீராக உள்ளதால் விலை ₹{price}/கிலோ வரை உயர்கிறது."
            if metrics['seasonalityMultiplier'] >= 1.05
            else f"மண்டிகளில் புதிய பயிர் வரத்து அதிகரித்து வருகிறது. {quantity} கிலோ அளவுக்கான மொத்த கொள்முதல் சாத்தியம் உள்ளது."
        )

        market_factor = (
            "சில்லறை மற்றும் மொத்த சந்தைகளில் வாங்குபவர்களின் தேவை மிக அதிகமாக உள்ளது. "
            "பண்டிகை மற்றும் நுகர்வு தேவைகள் விலையை ஆதரிக்கின்றன."
            if demand_trend == 'High'
            else "சந்தை தேவை சீராக உள்ளது; மொத்த வியாபாரிகள் போட்டி விலையில் கொள்முதல் செய்ய ஆர்வமாக உள்ளனர்."
        )

        spread = metrics['locationLogisticsSpreadINR']
        sign = '+' if spread > 0 else ''
        location_factor = (
            f"{state} மண்டி நிலவரப்படி, போக்குவரத்து மற்றும் உள்ளூர் விநியோக மையங்களின் தேவை "
            f"₹{sign}{spread} மாற்றத்தை ஏற்படுத்தியுள்ளது."
        )

        strategic_advice = (
            f"பரிந்துரை: சிறந்த லாபத்தைப் பெற {best_selling_time} காலத்திற்குள் விற்பனை செய்யவும். "
            "தரமான தரம் பிரித்தல் மூலம் கூடுதல் விலை பெறலாம்."
        )

        return {
            'factors': {
                'weather': weather_factor,
                'production': production_factor,
                'market': market_factor,
                'location': location_factor,
            },
            'strategicAdvice': strategic_advice,
        }

    # English deterministic XAI
    weather_factor = (
        f"Current weather patterns and temperature stability in {state} have maintained excellent produce quality with minimal harvest damage."
        if metrics['weatherRiskFactorINR'] >= 0
        else f"Recent humidity and precipitation in {state} warrant swift mandi dispatch to avoid storage moisture degradation."
    )

    production_factor = (
        f"Arrival volumes for {variety} {crop} are in a supply tightening phase before next harvest arrivals, creating favorable spot rate conditions."
        if metrics['seasonalityMultiplier'] >= 1.05
        else f"Mandi arrival volumes are steady with moderate fresh harvest inflows across primary APMC collection centers."
    )

    market_factor = (
        "Procurement demand across terminal mandis and institutional buyers is elevated, sustaining strong bid spreads."
        if demand_trend == 'High'
        else "Wholesale buyer absorption rate is well balanced with steady weekly inventory movement."
    )

    spread = metrics['locationLogisticsSpreadINR']
    location_factor = (
        f"Mandi connectivity in {state} maintains efficient supply dispatch with logistics basis premium of ₹{spread:+.2f}/kg."
    )

    strategic_advice = (
        f"Optimal Market Action: Initiate direct buyer contracts within {best_selling_time.lower()} to capture current peak realization."
    )

    return {
        'factors': {
            'weather': weather_factor,
            'production': production_factor,
            'market': market_factor,
            'location': location_factor,
        },
        'strategicAdvice': strategic_advice,
    }


def enhance_with_gemini_if_available(
    crop_name: str,
    variety: str,
    quantity: float,
    location: str,
    quant: Dict[str, Any],
    lang: str = 'en'
) -> Optional[Dict[str, str]]:
    """
    Optional Gemini API enhancement for XAI explanations when API key is configured.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
    if not api_key:
        return None

    is_tamil = lang == 'ta'
    language_target = 'Tamil (தமிழ்)' if is_tamil else 'English'

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    prompt = f"""
    You are an expert agricultural economist for Indian Mandi systems.
    Generate a concise Explainable AI (XAI) breakdown for a farmer's crop listing:
    
    Crop: {crop_name} ({variety})
    Quantity: {quantity} kg
    State: {location}
    Calculated Hedonic Model Price: ₹{quant['predictedPrice']}/kg (Baseline: ₹{quant['baselinePrice']}/kg)
    Demand Trend: {quant['demandTrend']}
    Optimal Window: {quant['bestSellingTime']}
    
    LANGUAGE REQUIREMENT: Respond ALL text in {language_target}.
    
    Return STRICT JSON with keys:
    - "weather": string (Analysis on how {location} weather affects this crop)
    - "production": string (Analysis on supply/yield balance)
    - "market": string (Analysis on demand trends)
    - "location": string (Specific logistics insights for {location})
    - "strategicAdvice": string (Practical marketing recommendation for the farmer)
    """

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            text_part = data['candidates'][0]['content']['parts'][0]['text']
            parsed = json.loads(text_part)
            return {
                'weather': parsed.get('weather', ''),
                'production': parsed.get('production', ''),
                'market': parsed.get('market', ''),
                'location': parsed.get('location', ''),
                'strategicAdvice': parsed.get('strategicAdvice', '')
            }
    except Exception as e:
        sys.stderr.write(f"[XAI Explainer] Gemini API call skipped: {str(e)}\n")
        return None


def generate_complete_prediction(
    crop_name: str,
    variety: str,
    quantity: float,
    location: str,
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Executes the complete end-to-end Python prediction algorithm pipeline:
    1. Runs Econometric Multi-Factor Regression Model
    2. Runs Explainable AI Attribution Engine
    3. Synthesizes complete prediction response
    """
    # 1. Quantitative Econometric Model
    quant = run_econometric_pricing_algorithm(
        crop_name=crop_name,
        variety=variety,
        quantity=quantity,
        location=location,
        language=language
    )

    # 2. XAI Attribution & Narrative
    gemini_factors = enhance_with_gemini_if_available(
        crop_name, variety, quantity, location, quant, language
    )

    if gemini_factors and all(gemini_factors.get(k) for k in ('weather', 'production', 'market', 'location')):
        factors = {
            'weather': gemini_factors['weather'],
            'production': gemini_factors['production'],
            'market': gemini_factors['market'],
            'location': gemini_factors['location'],
        }
        strategic_advice = gemini_factors.get('strategicAdvice', '')
    else:
        det = generate_deterministic_explanation(
            crop_name, variety, quantity, location, quant, language
        )
        factors = det['factors']
        strategic_advice = det['strategicAdvice']

    # 3. Complete Unified Response Payload
    return {
        'predictedPrice': quant['predictedPrice'],
        'minPrice': quant['minPrice'],
        'maxPrice': quant['maxPrice'],
        'baselinePrice': quant['baselinePrice'],
        'demandTrend': quant['demandTrend'],
        'bestSellingTime': quant['bestSellingTime'],
        'volatility': quant['volatility'],
        'factors': factors,
        'attributions': quant['attributions'],
        'metrics': quant['metrics'],
        'strategicAdvice': strategic_advice,
    }
