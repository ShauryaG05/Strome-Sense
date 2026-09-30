import httpx
from dataclasses import dataclass
from config import settings

@dataclass
class CycloneData:
    lat: float
    lon: float
    wind_speed: float      # m/s
    pressure: float        # hPa
    storm_surge: float     # meters (derived)
    rainfall: float        # mm/hr
    name: str = "Unknown"

async def fetch_weather(lat: float, lon: float) -> CycloneData:
    if settings.openweather_api_key == "YOUR_OPENWEATHER_API_KEY":
        return CycloneData(lat=lat, lon=lon, wind_speed=55.0, pressure=980, storm_surge=2.0, rainfall=120.0, name="Demo Cyclone")

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": settings.openweather_api_key, "units": "metric"}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        d = r.json()
    wind = d.get("wind", {}).get("speed", 0)
    pressure = d.get("main", {}).get("pressure", 1013)
    rain = d.get("rain", {}).get("1h", 0)
    # ponytail: storm surge naive linear approx, replace with tide model if needed
    surge = max(0, (1013 - pressure) * 0.01 + wind * 0.05)
    return CycloneData(
        lat=lat, lon=lon,
        wind_speed=wind, pressure=pressure,
        storm_surge=surge, rainfall=rain,
        name=d.get("name", "Unknown"),
    )

async def get_current_cyclone(lat: float = 19.5, lon: float = 86.5) -> CycloneData:
    """Fetch current cyclone data for the active storm or coordinates."""
    return await fetch_weather(lat, lon)

