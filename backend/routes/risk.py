from fastapi import APIRouter, Query
from services.weather import fetch_weather
from services.infrastructure import fetch_infrastructure
from services.gemini import get_advisory
from models.risk_engine import compute_risk
from models.flood_model import flood_probability, estimate_elevation, estimate_coast_distance
from models.vulnerability import vulnerability_score

router = APIRouter(prefix="/risk", tags=["risk"])

@router.get("/assess")
async def assess(lat: float = Query(...), lon: float = Query(...)):
    cyclone = await fetch_weather(lat, lon)
    infra = await fetch_infrastructure(lat, lon)

    elev = await estimate_elevation(lat, lon)
    dist = estimate_coast_distance(lat, lon)
    flood_p = flood_probability(elev, cyclone.rainfall, dist)

    # ponytail: hardcoded mid-range defaults for demo; replace with census API
    vuln = vulnerability_score(
        pop_density_norm=0.6,
        infra_score=min(1, infra.hospitals.__len__() / 5),
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
