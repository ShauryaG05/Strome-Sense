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
    [out:json][timeout:10];
    node[amenity={amenity}](around:{radius},{lat},{lon});
    out count;
    """

async def fetch_infrastructure(lat: float, lon: float, radius: int = 10000) -> InfrastructureData:
    async with httpx.AsyncClient(timeout=15) as client:
        # hospitals
        r = await client.post(OVERPASS_URL, data={"data": _overpass_query(lat, lon, radius, "hospital")})
        hospitals = r.json().get("elements", []) if r.is_success else []

        # roads (way count proxy)
        road_q = f"[out:json][timeout:10];way[highway](around:{radius},{lat},{lon});out count;"
        r2 = await client.post(OVERPASS_URL, data={"data": road_q})
        roads = r2.json().get("elements", [{}])[0].get("tags", {}).get("total", 0) if r2.is_success else 0

        # power
        power_q = f"[out:json][timeout:10];node[power](around:{radius},{lat},{lon});out count;"
        r3 = await client.post(OVERPASS_URL, data={"data": power_q})
        power = r3.json().get("elements", [{}])[0].get("tags", {}).get("total", 0) if r3.is_success else 0

    return InfrastructureData(hospitals=hospitals, roads_count=int(roads), power_nodes=int(power))
