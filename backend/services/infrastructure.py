import httpx
from dataclasses import dataclass, field

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

@dataclass
class InfrastructureData:
    hospitals: list[dict] = field(default_factory=list)
    roads_count: int = 0
    power_nodes: int = 0

def _overpass_query(lat: float, lon: float, radius: int, amenity: str) -> str:
    return f"""
    [out:json][timeout:5];
    node[amenity={amenity}](around:{radius},{lat},{lon});
    out count;
    """

async def fetch_infrastructure(lat: float, lon: float, radius: int = 10000) -> InfrastructureData:
    hospitals = []
    roads = 0
    power = 0
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            try:
                r = await client.post(OVERPASS_URL, data={"data": _overpass_query(lat, lon, radius, "hospital")})
                if r.is_success:
                    hospitals = r.json().get("elements", [])
            except Exception:
                pass

            try:
                road_q = f"[out:json][timeout:5];way[highway](around:{radius},{lat},{lon});out count;"
                r2 = await client.post(OVERPASS_URL, data={"data": road_q})
                if r2.is_success:
                    roads = r2.json().get("elements", [{}])[0].get("tags", {}).get("total", 0)
            except Exception:
                pass

            try:
                power_q = f"[out:json][timeout:5];node[power](around:{radius},{lat},{lon});out count;"
                r3 = await client.post(OVERPASS_URL, data={"data": power_q})
                if r3.is_success:
                    power = r3.json().get("elements", [{}])[0].get("tags", {}).get("total", 0)
            except Exception:
                pass
    except Exception:
        pass

    return InfrastructureData(hospitals=hospitals, roads_count=int(roads or 0), power_nodes=int(power or 0))
