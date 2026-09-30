import os
import re
from typing import Literal, Optional

from fastapi import APIRouter
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from config import settings

router = APIRouter()

_client = None

def _get_client():
    global _client
    if _client is None:
        key = settings.gemini_api_key
        if key and key not in ("YOUR_GEMINI_API_KEY", ""):
            _client = genai.Client(api_key=key)
    return _client

SYSTEM_INSTRUCTION = """You are StormSense AI, an expert disaster response and meteorological intelligence assistant.
Your goal is to assist users, emergency responders, and coastal authorities with cyclone risk analysis, evacuation routes, safety preparedness, weather inquiries, and emergency resource management.
Keep answers clear, actionable, and empathetic. Prioritize life safety and official disaster management guidelines."""

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)

class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=50)

class ChatResponse(BaseModel):
    reply: str

def _fallback_cyclone_reply(last_user_msg: str) -> str:
    msg_lower = last_user_msg.lower()
    
    if any(k in msg_lower for k in ["evacuat", "leave", "zone", "route", "shelter"]):
        return (
            "🌀 **Evacuation & Shelter Guidance**:\n\n"
            "1. **Identify High-Ground Shelters**: Move to designated multi-purpose cyclone shelters at least 15–20 meters above sea level.\n"
            "2. **Evacuation Priority**: Immediate evacuation applies to coastal zones within 10–15 km of shore and low-lying floodplains.\n"
            "3. **What to Carry**: Emergency Go-Bag with 72h potable water, non-perishable food, flashlight, power bank, first-aid kit, and essential documents in waterproof bags.\n"
            "4. **Emergency Services**: Contact local Disaster Management Authority or dial national emergency lines (112/1070)."
        )
    elif any(k in msg_lower for k in ["safe", "protect", "prepare", "kit", "precaution"]):
        return (
            "🛡️ **Cyclone Safety & Preparation Checklist**:\n\n"
            "• **Before Landfall**: Board up glass windows, secure rooftop solar panels/tin sheets, and prune tree branches near powerlines.\n"
            "• **During Landfall**: Stay indoors away from windows. Turn off main power and gas lines. Do not venture outside during the calm 'eye' of the storm.\n"
            "• **Water & Sanitation**: Store at least 4-5 liters of drinking water per person per day. Boil water before drinking.\n"
            "• **Communication**: Keep battery-powered radios tuned to official meteorological bulletins."
        )
    elif any(k in msg_lower for k in ["risk", "wind", "surge", "flood", "level", "speed"]):
        return (
            "📊 **Cyclone Risk Assessment Overview**:\n\n"
            "StormSense calculates multi-factor composite risk based on:\n"
            "• **Wind Intensity**: Category scale derived from 1-minute to 3-minute sustained wind speeds.\n"
            "• **Storm Surge**: Inundation risk factoring in bathymetry and astronomical tidal peaks.\n"
            "• **Rainfall & Flash Flooding**: Hourly accumulation rates and soil saturation index.\n"
            "• **Vulnerability Index**: Population density and structural exposure in coastal districts."
        )
    elif any(k in msg_lower for k in ["contact", "help", "emergency", "call", "phone", "number"]):
        return (
            "🚨 **Emergency Contacts & Helpline Directory**:\n\n"
            "• **National Emergency Response**: 112\n"
            "• **National Disaster Response Force (NDRF)**: 011-24363260 / 1070\n"
            "• **Coast Guard Emergency Helpline**: 1554\n"
            "• **Medical & Ambulance**: 108 / 102\n\n"
            "For local coordinates, click on the **StormSense Map** to inspect zone-specific rescue readiness."
        )
    else:
        return (
            f"🌀 **StormSense Emergency Assistant**:\n\n"
            f"I have received your query: *\"{last_user_msg}\"*.\n\n"
            "I can assist you with:\n"
            "• Real-time cyclone trajectory and risk analysis\n"
            "• Evacuation protocols and shelter availability\n"
            "• Disaster preparedness checklists\n"
            "• Alert dispatch and resource allocation recommendations\n\n"
            "What specific location or cyclone information would you like to explore?"
        )

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    last_msg = req.messages[-1].content if req.messages else ""
    client = _get_client()

    if client:
        # Gemini format conversion
        contents = []
        for m in req.messages:
            role = "model" if m.role == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=m.content)]))
        
        models_to_try = [
            os.getenv("GEMINI_MODEL", "gemini-3.0-flash"),
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ]
        
        for model_name in models_to_try:
            try:
                r = await client.aio.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        temperature=0.7,
                    ),
                )
                if r and r.text and r.text.strip():
                    return {"reply": r.text.strip()}
            except Exception as e:
                print(f"Gemini chat error with model {model_name}: {e}")
                continue

    # Graceful fallback to domain-aware intelligent disaster assistant
    return {"reply": _fallback_cyclone_reply(last_msg)}

