import json
import logging
import re
from typing import Optional

import httpx

from config import settings
from models.risk_engine import RiskScore
from services.weather import CycloneData

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE = """
You are a disaster risk analyst. Given cyclone data, return a structured emergency advisory.

CYCLONE: {name} at ({lat}, {lon})
Wind: {wind} m/s | Pressure: {pressure} hPa | Surge: {surge}m | Rain: {rain}mm/hr
RISK: {level} ({total}/100) — Wind:{w} Surge:{s} Flood:{f} Vuln:{v}

Respond ONLY with valid JSON conforming to this structure:
{{
  "summary": "2-sentence plain-language risk summary",
  "immediate_actions": ["action1", "action2", "action3"],
  "evacuation_zones": ["zone description 1", "zone description 2"],
  "resource_needs": {{"shelters": 10, "medical_teams": 5, "rescue_boats": 4}},
  "timeline_hours": 48
}}
"""


def _demo_advisory(cyclone: CycloneData, risk: RiskScore) -> dict:
    """Return a realistic mock advisory for demo mode (no API key configured)."""
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
    """Generate cyclone disaster advisory using AI (Groq/xAI)."""
    api_key, base_url, models = settings.get_ai_config()
    if not api_key:
        logger.info("No AI API key found. Using mock advisory.")
        return _demo_advisory(cyclone, risk)

    prompt = PROMPT_TEMPLATE.format(
        name=cyclone.name,
        lat=cyclone.lat,
        lon=cyclone.lon,
        wind=cyclone.wind_speed,
        pressure=cyclone.pressure,
        surge=cyclone.storm_surge,
        rain=cyclone.rainfall,
        level=risk.level,
        total=risk.total,
        w=risk.wind,
        s=risk.surge,
        f=risk.flood,
        v=risk.vulnerability,
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = f"{base_url.rstrip('/')}/chat/completions"

    async with httpx.AsyncClient(timeout=30.0) as client:
        for model_name in models:
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a disaster risk analyst. Always output strictly valid JSON with no markdown formatting.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            }

            try:
                logger.info(f"Requesting Grok advisory with model: {model_name}")
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.warning(
                        f"Grok API error {response.status_code} for {model_name}: {response.text}"
                    )
                    continue

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                # Clean any markdown fences if present
                clean_json = re.sub(r"```json\s*|\s*```", "", content).strip()
                parsed = json.loads(clean_json)
                return parsed

            except Exception as e:
                logger.error(f"Grok advisory attempt failed with model {model_name}: {e}")
                continue

    logger.warning("All Grok models failed or quota exceeded. Falling back to demo advisory.")
    return _demo_advisory(cyclone, risk)
