import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[0]))

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import api
from api import app
from features import (
    FEATURES,
    build_features,
    city_distance_km,
    hard_filter,
    haversine_km,
    is_compatible,
)

client = TestClient(app)


class _StubMatchModel:
    """Minimal probability estimator prioritizing same-city and eligible-gap donors."""

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        scores = (
            0.55 * X["same_city"].to_numpy(dtype=float)
            + 0.25 * X["exact_group"].to_numpy(dtype=float)
            + 0.15 * X["gap_ok"].to_numpy(dtype=float)
        )
        p_pos = np.clip(scores, 0.05, 0.99)
        return np.column_stack([1.0 - p_pos, p_pos])


def donor(
    i,
    bg,
    city="Jaipur",
    elig=True,
    last="2025-01-01",
    gender="Male",
    lat=None,
    lon=None,
):
    return {
        "donor_id": i,
        "blood_group": bg,
        "city": city,
        "gender": gender,
        "age": 30,
        "hemoglobin": 14.0,
        "total_donations": 3,
        "last_donation_date": last,
        "eligible": elig,
        "lat": lat,
        "lon": lon,
    }


def test_compatibility_rules():
    assert is_compatible("A+", "O-") and is_compatible("AB+", "B-")
    assert is_compatible("O+", "O+") and is_compatible("O+", "O-")
    assert not is_compatible("O-", "O+") and not is_compatible("A-", "A+")


def test_haversine_and_city_distance():
    assert city_distance_km("Jaipur", "Jaipur") == 5.0
    assert 220 < city_distance_km("Jaipur", "Delhi") < 250
    assert math.isnan(city_distance_km("Jaipur", "UnknownTown"))
    assert abs(haversine_km(26.9124, 75.7873, 26.9124, 75.7873)) < 1e-6


def test_hard_filter_removes_incompatible_and_ineligible():
    df = pd.DataFrame([donor("1", "O-"), donor("2", "A+"), donor("3", "O-", elig=False)])
    out = hard_filter(df, {"blood_group": "O-"})
    assert list(out.donor_id) == ["1"]


def test_gender_specific_donation_gap_and_gps_override():
    df = pd.DataFrame([
        donor("m1", "O+", last="2026-07-10", gender="Male", lat=26.92, lon=75.79),
        donor("f1", "O+", last="2026-07-10", gender="Female"),
    ])
    # 104 days gap: eligible for Male (>=90d) but not Female (<120d)
    f = build_features(
        df,
        {
            "blood_group": "O+",
            "city": "Jaipur",
            "urgency": "HIGH",
            "lat": 26.9124,
            "lon": 75.7873,
            "today": "2026-10-22",
        },
    )
    assert f.loc[0, "gap_ok"] == 1
    assert f.loc[1, "gap_ok"] == 0
    assert f.loc[0, "distance_km"] < 2.0
    assert f.loc[1, "distance_km"] == 5.0


def test_api_health_and_match(monkeypatch):
    monkeypatch.setattr(
        api,
        "_match",
        {"model": _StubMatchModel(), "features": FEATURES, "name": "StubXGB"},
    )

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["success"] is True

    body = {
        "blood_group": "B-",
        "city": "Jaipur",
        "urgency": "CRITICAL",
        "units_required": 1,
        "donors": [
            donor("1", "B-"),
            donor("2", "O-", "Delhi"),
            donor("3", "A+"),
            donor("4", "B-", elig=False),
        ],
    }
    res = client.post("/match", json=body)
    assert res.status_code == 200
    payload = res.json()
    ids = [m["donor_id"] for m in payload["matches"]]
    assert set(ids) == {"1", "2"}
    assert ids[0] == "1"
    probs = [m["response_probability"] for m in payload["matches"]]
    assert probs == sorted(probs, reverse=True)


def test_api_empty_pool_and_missing_models(monkeypatch):
    monkeypatch.setattr(api, "_match", None)
    monkeypatch.setattr(api, "_demand", None)

    body = {
        "blood_group": "O-",
        "city": "Jaipur",
        "urgency": "HIGH",
        "donors": [donor("1", "AB+")],
    }
    assert client.post("/match", json=body).status_code == 503
    assert client.get("/demand-forecast").status_code == 503

    monkeypatch.setattr(
        api,
        "_match",
        {"model": _StubMatchModel(), "features": FEATURES, "name": "StubXGB"},
    )
    empty_res = client.post("/match", json=body)
    assert empty_res.status_code == 200
    assert empty_res.json()["count"] == 0
    assert empty_res.json()["matches"] == []


def test_api_rejects_bad_input(monkeypatch):
    monkeypatch.setattr(
        api,
        "_match",
        {"model": _StubMatchModel(), "features": FEATURES, "name": "StubXGB"},
    )
    bad_group = {"blood_group": "Z+", "city": "Jaipur", "urgency": "HIGH", "donors": []}
    assert client.post("/match", json=bad_group).status_code == 422

    bad_urgency = {"blood_group": "O+", "city": "Jaipur", "urgency": "EXTREME", "donors": []}
    assert client.post("/match", json=bad_urgency).status_code == 422
