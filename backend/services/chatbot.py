import logging
import os
from typing import Optional

from google import genai
from google.genai import types

from config import settings
from models.flood_model import estimate_coast_distance, estimate_elevation, flood_probability
from models.risk_engine import compute_risk
from models.vulnerability import vulnerability_score
from services.infrastructure import fetch_infrastructure
from services.weather import fetch_weather, get_current_cyclone

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are StromeSense, an AI cyclone risk assistant.

Your job is to help users understand cyclone conditions, predicted risk, weather hazards, and potential impacts.

IMPORTANT RULES:
1. Never invent cyclone data.
2. Never invent risk scores.
3. Never invent wind speeds, rainfall, or storm surge values.
4. For current cyclone status, trajectory, or intensity, use get_current_cyclone_data.
5. For location-specific risk inquiries (e.g. Odisha, Chennai, Kolkata, coastal districts, or specific coordinates), use get_location_risk.
6. Treat tool results as authoritative data from StromeSense.
7. Clearly distinguish predictions from observed data.
8. If required data is unavailable, clearly state that it is unavailable.
9. Do not present an AI prediction as an official government warning.
10. For general educational questions (e.g., "What is a cyclone?", "What is storm surge?"), answer directly with accurate meteorological explanations.
"""

def _get_client() -> Optional[genai.Client]:
    key = settings.gemini_api_key
    if key and key not in ("YOUR_GEMINI_API_KEY", ""):
        return genai.Client(api_key=key)
    return None


async def get_location_risk(
    latitude: float,
    longitude: float,
    forecast_hours: int = 24,
) -> dict:
    """Assess real cyclone risk and multi-hazard factors for specific coordinates and forecast horizon.

    Args:
        latitude: Latitude coordinate (-90 to 90).
        longitude: Longitude coordinate (-180 to 180).
        forecast_hours: Prediction time window in hours (e.g. 24, 48, 72).
    """
    try:
        cyclone = await fetch_weather(latitude, longitude)
        infra = await fetch_infrastructure(latitude, longitude)
        elev = await estimate_elevation(latitude, longitude)
        dist = estimate_coast_distance(latitude, longitude)
        flood_p = flood_probability(elev, cyclone.rainfall, dist)

        vuln = vulnerability_score(
            pop_density_norm=0.6,
            infra_score=min(1.0, len(infra.hospitals) / 5.0) if infra.hospitals else 0.2,
            shelter_ratio=0.4,
            income_idx=0.5,
        )

        risk = compute_risk(cyclone, flood_p, vuln)

        return {
            "status": "success",
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "location_name": cyclone.name,
            },
            "forecast_hours": forecast_hours,
            "cyclone_name": cyclone.name,
            "observations": {
                "wind_speed_ms": cyclone.wind_speed,
                "pressure_hpa": cyclone.pressure,
                "rainfall_mmhr": cyclone.rainfall,
                "storm_surge_m": cyclone.storm_surge,
            },
            "risk_assessment": {
                "risk_score": risk.total,
                "risk_level": risk.level,
                "wind_risk_score": risk.wind,
                "surge_risk_score": risk.surge,
                "flood_risk_score": risk.flood,
                "vulnerability_score": risk.vulnerability,
                "flood_probability": flood_p,
            },
            "infrastructure_summary": {
                "hospitals_nearby": len(infra.hospitals),
                "roads_count": infra.roads_count,
                "power_nodes": infra.power_nodes,
            },
        }
    except Exception as e:
        logger.error(f"Error computing location risk for ({latitude}, {longitude}): {e}")
        return {
            "status": "error",
            "message": f"Unable to retrieve risk assessment for coordinates ({latitude}, {longitude}).",
        }


async def get_current_cyclone_data(
    latitude: float = 19.5,
    longitude: float = 86.5,
) -> dict:
    """Get the latest available cyclone position, intensity, wind speed, pressure, rainfall, and storm surge.

    Args:
        latitude: Latitude coordinate of the storm center or monitoring point.
        longitude: Longitude coordinate of the storm center or monitoring point.
    """
    try:
        cyclone = await get_current_cyclone(latitude, longitude)
        return {
            "status": "success",
            "name": cyclone.name,
            "latitude": cyclone.lat,
            "longitude": cyclone.lon,
            "wind_speed_ms": cyclone.wind_speed,
            "pressure_hpa": cyclone.pressure,
            "rainfall_mmhr": cyclone.rainfall,
            "storm_surge_m": cyclone.storm_surge,
        }
    except Exception as e:
        logger.error(f"Error retrieving current cyclone data: {e}")
        return {
            "status": "error",
            "message": "Current cyclone meteorological data is currently unavailable.",
        }


async def chat_with_gemini(message: str) -> str:
    """Send a user message to Gemini with tool calling enabled to retrieve authoritative cyclone data."""
    if not message or not message.strip():
        return "Please ask a question about cyclone risk, current storms, or safety guidance."

    client = _get_client()
    if not client:
        logger.warning("Gemini API key is not configured.")
        return (
            "StormSense AI assistant is currently running in offline mode. "
            "Please configure a valid GEMINI_API_KEY in the backend environment to enable live AI responses."
        )

    models_to_try = [
        os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash-lite",
    ]

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.2,
        tools=[get_location_risk, get_current_cyclone_data],
    )

    last_error: Optional[Exception] = None

    for model_name in models_to_try:
        try:
            logger.info(f"Attempting Gemini chat with model: {model_name}")
            chat = client.aio.chats.create(
                model=model_name,
                config=config,
            )
            response = await chat.send_message(message)
            if response and response.text and response.text.strip():
                return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini chat failed with model {model_name}: {e}")
            last_error = e
            continue

    logger.error(f"All Gemini models failed. Last error: {last_error}")
    return (
        "The AI cyclone assistant is temporarily unavailable. "
        "Please check your API quota or network connection, or try again shortly."
    )