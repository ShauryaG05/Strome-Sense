from dataclasses import dataclass
from services.weather import CycloneData

@dataclass
class RiskScore:
    level: str
    total: float
    wind: float
    surge: float
    flood: float
    vulnerability: float

def compute_risk(cyclone: CycloneData, flood_p: float, vuln: float) -> RiskScore:
    # Example risk computation
    wind_score = min(100.0, cyclone.wind_speed / 70.0 * 100.0)
    surge_score = min(100.0, cyclone.storm_surge / 10.0 * 100.0)
    flood_score = flood_p * 100.0
    vuln_score = vuln * 100.0
    
    total = (wind_score * 0.4 + surge_score * 0.3 + flood_score * 0.2 + vuln_score * 0.1)
    
    if total > 80:
        level = "CRITICAL"
    elif total > 60:
        level = "HIGH"
    elif total > 40:
        level = "MEDIUM"
    else:
        level = "LOW"
        
    return RiskScore(
        level=level,
        total=round(total, 1),
        wind=round(wind_score, 1),
        surge=round(surge_score, 1),
        flood=round(flood_score, 1),
        vulnerability=round(vuln_score, 1)
    )

calculate_risk = compute_risk

