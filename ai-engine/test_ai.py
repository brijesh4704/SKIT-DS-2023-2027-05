import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pandas as pd
from fastapi.testclient import TestClient
from features import is_compatible, haversine_km, city_distance_km, hard_filter, build_features
from api import app

client = TestClient(app)


def donor(i, bg, city="Jaipur", elig=True, last="2025-01-01", gender="Male"):
    return {"donor_id": i, "blood_group": bg, "city": city, "gender": gender, "age": 30,
            "hemoglobin": 14.0, "total_donations": 3, "last_donation_date": last, "eligible": elig}


def test_compatibility_rules():
    assert is_compatible("A+", "O-") and is_compatible("AB+", "B-")
    assert not is_compatible("O-", "O+") and not is_compatible("A-", "A+")


def test_haversine_jaipur_delhi():
    assert 220 < city_distance_km("Jaipur", "Delhi") < 250


def test_hard_filter_removes_incompatible_and_ineligible():
    df = pd.DataFrame([donor("1", "O-"), donor("2", "A+"), donor("3", "O-", elig=False)])
    out = hard_filter(df, {"blood_group": "O-"})
    assert list(out.donor_id) == ["1"]


def test_recent_donor_gap_flag():
    df = pd.DataFrame([donor("1", "O+", last="2026-09-20")])
    f = build_features(df, {"blood_group": "O+", "city": "Jaipur", "urgency": "HIGH",
                            "today": "2026-10-22"})
    assert f.loc[0, "gap_ok"] == 0     # only 32 days since last donation


def test_api_health_and_match():
    assert client.get("/health").json()["success"]
    body = {"blood_group": "B-", "city": "Jaipur", "urgency": "CRITICAL", "units_required": 1,
            "donors": [donor("1", "B-"), donor("2", "O-", "Delhi"), donor("3", "A+"), donor("4", "B-", elig=False)]}
    r = client.post("/match", json=body).json()
    ids = [m["donor_id"] for m in r["matches"]]
    assert set(ids) == {"1", "2"}                     # A+ and ineligible never returned
    probs = [m["response_probability"] for m in r["matches"]]
    assert probs == sorted(probs, reverse=True)


def test_api_rejects_bad_input():
    bad = {"blood_group": "Z+", "city": "Jaipur", "urgency": "HIGH", "donors": []}
    assert client.post("/match", json=bad).status_code == 422
