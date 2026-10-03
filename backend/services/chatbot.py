import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from config import settings
from models.flood_model import estimate_coast_distance, estimate_elevation, flood_probability
from models.risk_engine import compute_risk
from models.vulnerability import vulnerability_score
from services.infrastructure import fetch_infrastructure
from services.weather import fetch_weather, get_current_cyclone

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are StromeSense AI, an intelligent cyclone risk assistant powered by Grok.

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

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_location_risk",
            "description": "Assess real cyclone risk and multi-hazard factors for specific coordinates and forecast horizon.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {
                        "type": "number",
                        "description": "Latitude coordinate (-90 to 90).",
                    },
                    "longitude": {
                        "type": "number",
                        "description": "Longitude coordinate (-180 to 180).",
                    },
                    "forecast_hours": {
                        "type": "integer",
                        "description": "Prediction time window in hours (e.g. 24, 48, 72).",
                        "default": 24,
                    },
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_cyclone_data",
            "description": "Get the latest available cyclone position, intensity, wind speed, pressure, rainfall, and storm surge.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {
                        "type": "number",
                        "description": "Latitude coordinate of the storm center or monitoring point.",
                        "default": 19.5,
                    },
                    "longitude": {
                        "type": "number",
                        "description": "Longitude coordinate of the storm center or monitoring point.",
                        "default": 86.5,
                    },
                },
            },
        },
    },
]


async def get_location_risk(
    latitude: float,
    longitude: float,
    forecast_hours: int = 24,
) -> dict:
    """Assess real cyclone risk and multi-hazard factors for specific coordinates and forecast horizon."""
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
    """Get the latest available cyclone position, intensity, wind speed, pressure, rainfall, and storm surge."""
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


async def _execute_tool_call(name: str, arguments_str: str) -> dict:
    """Execute local python tools requested by Grok."""
    try:
        args = json.loads(arguments_str) if arguments_str else {}
    except Exception:
        args = {}

    if name == "get_location_risk":
        lat = float(args.get("latitude", 19.5))
        lon = float(args.get("longitude", 86.5))
        hours = int(args.get("forecast_hours", 24))
        return await get_location_risk(latitude=lat, longitude=lon, forecast_hours=hours)

    elif name == "get_current_cyclone_data":
        lat = float(args.get("latitude", 19.5))
        lon = float(args.get("longitude", 86.5))
        return await get_current_cyclone_data(latitude=lat, longitude=lon)

    return {"error": f"Unknown tool: {name}"}


async def chat_with_grok(message: str) -> str:
    """Send a user message to AI (Groq/xAI) with function/tool calling enabled."""
    if not message or not message.strip():
        return "Please ask a question about cyclone risk, current storms, or safety guidance."

    api_key, base_url, models = settings.get_ai_config()
    if not api_key:
        logger.warning("No AI API key (GROQ_API_KEY, GROK_API_KEY, or XAI_API_KEY) is configured.")
        return (
            "StormSense AI assistant is currently running in offline mode. "
            "Please configure a valid API key (GROQ_API_KEY or GROK_API_KEY) in the backend environment to enable live AI responses."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = f"{base_url.rstrip('/')}/chat/completions"

    conversation_messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": message},
    ]

    last_error: Optional[Exception] = None

    async with httpx.AsyncClient(timeout=45.0) as client:
        for model_name in models:
            try:
                logger.info(f"Attempting Grok chat with model: {model_name}")

                initial_payload = {
                    "model": model_name,
                    "messages": conversation_messages,
                    "tools": TOOLS,
                    "tool_choice": "auto",
                    "temperature": 0.2,
                }

                resp = await client.post(url, headers=headers, json=initial_payload)
                if resp.status_code != 200:
                    logger.error(f"Grok API error ({resp.status_code}) for model {model_name}: {resp.text}")
                    last_error = Exception(f"API Error {resp.status_code}: {resp.text}")
                    continue

                res_json = resp.json()
                choice = res_json["choices"][0]
                message_obj = choice.get("message", {})
                tool_calls = message_obj.get("tool_calls")

                # If no tool calls were requested, return the direct response
                if not tool_calls:
                    content = message_obj.get("content", "")
                    if content and content.strip():
                        return content.strip()
                    continue

                # Handle tool calls
                step_messages = list(conversation_messages)
                step_messages.append(message_obj)

                for tool_call in tool_calls:
                    tool_id = tool_call.get("id")
                    fn = tool_call.get("function", {})
                    fn_name = fn.get("name")
                    fn_args = fn.get("arguments", "{}")

                    logger.info(f"Grok invoked tool '{fn_name}' with args: {fn_args}")
                    tool_output = await _execute_tool_call(fn_name, fn_args)

                    step_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "name": fn_name,
                        "content": json.dumps(tool_output),
                    })

                # Follow-up request with tool results to generate final response
                followup_payload = {
                    "model": model_name,
                    "messages": step_messages,
                    "temperature": 0.2,
                }

                followup_resp = await client.post(url, headers=headers, json=followup_payload)
                if followup_resp.status_code == 200:
                    followup_json = followup_resp.json()
                    final_content = followup_json["choices"][0]["message"].get("content", "")
                    if final_content and final_content.strip():
                        return final_content.strip()

            except Exception as e:
                logger.error(f"Grok chat failed with model {model_name}: {e}")
                last_error = e
                continue

    logger.error(f"All Grok models failed. Last error: {last_error}")
    return (
        "The AI cyclone assistant is temporarily unavailable. "
        "Please check your Grok API key, quota, or network connection, or try again shortly."
    )


# Alias for backward compatibility
chat_with_gemini = chat_with_grok