"""AI service for the Node backend.  Run:  uvicorn api:app --port 8000

POST /match            ranked donors for a blood request (hard safety filter + ML probability)
GET  /demand-forecast  next-4-weeks unit forecast per blood group
GET  /health

The backend should call /match and FALL BACK to its own rule-based ranking if this service
is down (see docs/INTEGRATION.md) so emergencies never depend on the ML service being up.
"""
from typing import List, Optional
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from config import MATCH_MODEL, DEMAND_MODEL
from features import build_features, hard_filter, URGENCY_LEVEL, COMPATIBLE_DONORS

app = FastAPI(title="BloodBond AI Service", version="2.0.0")
_match = joblib.load(MATCH_MODEL) if MATCH_MODEL.exists() else None
_demand = joblib.load(DEMAND_MODEL) if DEMAND_MODEL.exists() else None


class Donor(BaseModel):
    donor_id: str
    blood_group: str
    city: str
    gender: str = "Other"
    age: int = 30
    hemoglobin: Optional[float] = None
    total_donations: int = 0
    last_donation_date: Optional[str] = None
    eligible: bool = True
    lat: Optional[float] = None
    lon: Optional[float] = None


class MatchRequest(BaseModel):
    blood_group: str
    city: str
    urgency: str = Field("HIGH", description="LOW | MEDIUM | HIGH | CRITICAL")
    units_required: int = Field(1, ge=1)
    lat: Optional[float] = None
    lon: Optional[float] = None
    donors: List[Donor]
    top_n: int = Field(10, ge=1, le=50)


@app.get("/health")
def health():
    return {"success": True, "match_model_loaded": _match is not None,
            "demand_model_loaded": _demand is not None}


@app.post("/match")
def match(req: MatchRequest):
    if _match is None:
        raise HTTPException(503, "Match model not trained. Run train_donor_match_model.py")
    if req.blood_group not in COMPATIBLE_DONORS:
        raise HTTPException(422, f"Unknown blood group {req.blood_group}")
    if req.urgency.upper() not in URGENCY_LEVEL:
        raise HTTPException(422, f"Unknown urgency {req.urgency}")
    donors = pd.DataFrame([d.model_dump() for d in req.donors])
    request = req.model_dump(exclude={"donors", "top_n"})
    pool = hard_filter(donors, request)
    if pool.empty:
        return {"success": True, "count": 0, "matches": [], "message": "No compatible eligible donors"}
    feats = build_features(pool, request)
    prob = _match["model"].predict_proba(feats[_match["features"]])[:, 1]
    feats = feats.assign(response_probability=prob).sort_values("response_probability", ascending=False)
    top = feats.head(req.top_n)
    return {"success": True, "count": len(top), "model": _match["name"],
            "matches": [{"donor_id": r.donor_id, "blood_group": r.blood_group,
                         "distance_km": round(float(r.distance_km), 1),
                         "response_probability": round(float(r.response_probability), 4),
                         "matchScore": int(round(float(r.response_probability) * 100)),
                         "exact_group": bool(r.exact_group)} for r in top.itertuples()]}


@app.get("/demand-forecast")
def demand_forecast():
    if _demand is None:
        raise HTTPException(503, "Demand model not trained. Run forecast_demand.py")
    return {"success": True, "unit": "units per week, next 4 weeks", "forecast": _demand["forecast"]}
