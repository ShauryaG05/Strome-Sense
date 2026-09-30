import httpx

def flood_probability(elevation_m: float, rainfall_mmhr: float, distance_coast_km: float) -> float:
    """Returns 0-1 flood probability."""
    # Higher rainfall, lower elevation, closer coast = worse
    rain_factor = min(1.0, rainfall_mmhr / 50)           # 50mm/hr = saturation
    elev_factor = max(0.0, 1 - elevation_m / 20)         # 0m coast = 1, 20m+ = 0
    coast_factor = max(0.0, 1 - distance_coast_km / 50)  # within 50km matters
    prob = 0.5 * rain_factor + 0.3 * elev_factor + 0.2 * coast_factor
    return round(min(1.0, prob), 3)

async def estimate_elevation(lat: float, lon: float) -> float:
    """Calls Open-Elevation API to estimate elevation."""
    url = "https://api.open-elevation.com/api/v1/lookup"
    params = {"locations": f"{lat},{lon}"}
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, params=params, timeout=10.0)
            if r.is_success:
                data = r.json()
                results = data.get("results", [])
                if results:
                    return results[0].get("elevation", 5.0)
    except Exception:
        pass
    return 5.0

def estimate_coast_distance(lat: float, lon: float) -> float:
    """Stub: haversine to nearest known coastal point. Returns 10km for demo."""
    # ponytail: replace with shapely + coastline shapefile if accuracy matters
    return 10.0
