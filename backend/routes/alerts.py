from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/alerts", tags=["alerts"])

# ponytail: in-memory log — use DB if persistence needed
_alert_log: list[dict] = []

@router.post("/dispatch")
async def dispatch(alert: dict):
    record = {**alert, "id": len(_alert_log) + 1, "dispatched_at": datetime.now(timezone.utc).isoformat(), "status": "dispatched"}
    _alert_log.append(record)
    return record

@router.get("/log")
def log():
    return _alert_log

@router.post("/{alert_id}/approve")
def approve(alert_id: int):
    for a in _alert_log:
        if a["id"] == alert_id:
            a["status"] = "approved"
            return a
    return {"error": "not found"}
