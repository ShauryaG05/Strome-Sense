import logging
from fastapi import APIRouter, Query
from services.weather import fetch_weather, CycloneData
from services.infrastructure import fetch_infrastructure, InfrastructureData
from services.gemini import get_advisory
from models.risk_engine import compute_risk, RiskScore
from models.flood_model import flood_probability, estimate_elevation, estimate_coast_distance
from models.vulnerability import vulnerability_score

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["risk"])

@router.get("/assess")
async def assess(lat: float = Query(...), lon: float = Query(...)):
    try:
        cyclone = await fetch_weather(lat, lon)
    except Exception as e:
        logger.error(f"Error fetching weather for ({lat}, {lon}): {e}")
        cyclone = CycloneData(lat=lat, lon=lon, wind_speed=15.0, pressure=1010, storm_surge=0.5, rainfall=10.0, name="Observed Location")

    try:
        infra = await fetch_infrastructure(lat, lon)
    except Exception as e:
        logger.error(f"Error fetching infrastructure for ({lat}, {lon}): {e}")
        infra = InfrastructureData()

    try:
        elev = await estimate_elevation(lat, lon)
    except Exception:
        elev = 10.0

    try:
        dist = estimate_coast_distance(lat, lon)
    except Exception:
        dist = 10.0

    flood_p = flood_probability(elev, cyclone.rainfall, dist)

    vuln = vulnerability_score(
        pop_density_norm=0.6,
        infra_score=min(1, len(infra.hospitals) / 5) if infra.hospitals else 0.2,
        shelter_ratio=0.4,
        income_idx=0.5,
    )

    risk = compute_risk(cyclone, flood_p, vuln)
    advisory = await get_advisory(cyclone, risk)

    return {
        "location": {"lat": lat, "lon": lon, "name": cyclone.name},
        "cyclone": cyclone.__dict__,
        "risk": risk.__dict__,
        "infrastructure": infra.__dict__,
        "advisory": advisory,
    }
