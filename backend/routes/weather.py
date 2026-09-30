from fastapi import APIRouter, Query
from services.weather import fetch_weather

router = APIRouter(prefix="/weather", tags=["weather"])

@router.get("/current")
async def current(lat: float = Query(...), lon: float = Query(...)):
    data = await fetch_weather(lat, lon)
    return data.__dict__
