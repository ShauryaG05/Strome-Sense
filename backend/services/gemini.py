from google import genai
from config import settings
from models.risk_engine import RiskScore
from services.weather import CycloneData
import json
import re

def _get_client():
    key = settings.gemini_api_key
    if key and key not in ("YOUR_GEMINI_API_KEY", ""):
        return genai.Client(api_key=key)
    return None



PROMPT_TEMPLATE = """
You are a disaster risk analyst. Given cyclone data, return structured advisory.

CYCLONE: {name} at ({lat}, {lon})
Wind: {wind} m/s | Pressure: {pressure} hPa | Surge: {surge}m | Rain: {rain}mm/hr
RISK: {level} ({total}/100) — Wind:{w} Surge:{s} Flood:{f} Vuln:{v}

Respond in this exact JSON:
{{
  "summary": "2-sentence plain-language risk summary",
  "immediate_actions": ["action1", "action2", "action3"],
  "evacuation_zones": ["zone description"],
  "resource_needs": {{"shelters": N, "medical_teams": N, "rescue_boats": N}},
  "timeline_hours": N
}}
"""


def _demo_advisory(cyclone: CycloneData, risk: RiskScore) -> dict:
    """Return a realistic mock advisory for demo mode (no API key)."""
    return {
        "summary": (
            f"Cyclone {cyclone.name} poses a {risk.level} risk with winds of "
            f"{cyclone.wind_speed} m/s and {cyclone.rainfall} mm/hr rainfall. "
            f"Immediate precautionary measures are recommended for coastal areas."
        ),
        "immediate_actions": [
            "Evacuate low-lying coastal zones within 10 km of shore",
            "Activate emergency shelters and stock medical supplies",
            "Secure loose structures and deploy rescue boats on standby",
        ],
        "evacuation_zones": [
            f"Coastal areas within 15 km of ({cyclone.lat:.2f}, {cyclone.lon:.2f})",
            "River flood plains and low-elevation zones below 5m",
        ],
        "resource_needs": {
            "shelters": max(5, int(risk.total / 10)),
            "medical_teams": max(3, int(risk.total / 15)),
            "rescue_boats": max(2, int(risk.total / 20)),
        },
        "timeline_hours": 48 if risk.total > 60 else 72,
    }


async def get_advisory(cyclone: CycloneData, risk: RiskScore) -> dict:
    # Demo mode: return mock advisory if no real API key is configured
    if settings.gemini_api_key in ("YOUR_GEMINI_API_KEY", "", None):
        return _demo_advisory(cyclone, risk)

    prompt = PROMPT_TEMPLATE.format(
        name=cyclone.name, lat=cyclone.lat, lon=cyclone.lon,
        wind=cyclone.wind_speed, pressure=cyclone.pressure,
        surge=cyclone.storm_surge, rain=cyclone.rainfall,
        level=risk.level, total=risk.total,
        w=risk.wind, s=risk.surge, f=risk.flood, v=risk.vulnerability,
    )
    
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash-lite"]
    client = _get_client()
    if not client:
        return _demo_advisory(cyclone, risk)


    for model_name in models_to_try:
        try:
            resp = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            text = resp.text
            text = re.sub(r"```json\s*|\s*```", "", text).strip()
            return json.loads(text)
        except Exception as e:
            print(f"Gemini model {model_name} attempt failed: {e}")
            continue

    print("All Gemini models failed or experienced capacity limits. Falling back to demo advisory.")
    return _demo_advisory(cyclone, risk)


