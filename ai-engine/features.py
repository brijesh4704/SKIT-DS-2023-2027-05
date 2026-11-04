"""Shared feature engineering: blood compatibility, distance, availability.
Used by training AND by the API, so the model sees identical features in both."""
from __future__ import annotations
import math
import numpy as np
import pandas as pd

# recipient group -> donor groups that can give to them (same map as the backend)
COMPATIBLE_DONORS = {
    "A+": ["A+", "A-", "O+", "O-"], "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"], "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"], "O-": ["O-"],
}
URGENCY_LEVEL = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

# approximate city centres (lat, lon) used when exact GPS is not available
CITY_COORDS = {
    "Ahmedabad": (23.0225, 72.5714), "Bengaluru": (12.9716, 77.5946),
    "Bhopal": (23.2599, 77.4126), "Chennai": (13.0827, 80.2707),
    "Delhi": (28.6139, 77.2090), "Gurgaon": (28.4595, 77.0266),
    "Hyderabad": (17.3850, 78.4867), "Indore": (22.7196, 75.8577),
    "Jaipur": (26.9124, 75.7873), "Kanpur": (26.4499, 80.3319),
    "Kota": (25.2138, 75.8648), "Kolkata": (22.5726, 88.3639),
    "Lucknow": (26.8467, 80.9462), "Mohali": (30.7046, 76.7179),
    "Mumbai": (19.0760, 72.8777), "Nagpur": (21.1458, 79.0882),
    "Patna": (25.5941, 85.1376), "Pune": (18.5204, 73.8567),
    "Surat": (21.1702, 72.8311), "Thiruvananthapuram": (8.5241, 76.9366),
    "Udaipur": (24.5854, 73.7125), "Vadodara": (22.3072, 73.1812),
    "Visakhapatnam": (17.6868, 83.2185),
}

FEATURES = [
    "distance_km", "exact_group", "days_since_last_donation", "gap_ok",
    "total_donations", "age", "hemoglobin", "urgency_level", "units_required",
    "same_city",
]


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dlat, dlon = p2 - p1, np.radians(lon2) - np.radians(lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlon / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


def city_distance_km(city_a: str, city_b: str) -> float:
    if city_a == city_b:
        return 5.0  # same city: assume a short local trip
    if city_a not in CITY_COORDS or city_b not in CITY_COORDS:
        return float("nan")
    return float(haversine_km(*CITY_COORDS[city_a], *CITY_COORDS[city_b]))


def is_compatible(request_group: str, donor_group: str) -> bool:
    return donor_group in COMPATIBLE_DONORS.get(request_group, [])


def build_features(donors: pd.DataFrame, request: dict) -> pd.DataFrame:
    """One row per donor for ONE request.
    donors columns: blood_group, city, gender, age, hemoglobin, total_donations,
                    last_donation_date, [lat, lon]
    request keys:   blood_group, city, urgency, units_required, [lat, lon]
    """
    d = donors.copy()
    today = pd.Timestamp(request.get("today", pd.Timestamp.today().normalize()))
    last = pd.to_datetime(d["last_donation_date"], errors="coerce")
    d["days_since_last_donation"] = (today - last).dt.days.fillna(9999).clip(lower=0)
    min_gap = d["gender"].map(lambda g: 90 if g == "Male" else 120)
    d["gap_ok"] = (d["days_since_last_donation"] >= min_gap).astype(int)
    d["exact_group"] = (d["blood_group"] == request["blood_group"]).astype(int)
    d["same_city"] = (d["city"] == request["city"]).astype(int)

    d["distance_km"] = d["city"].map(lambda c: city_distance_km(c, request["city"]))  # fallback
    if request.get("lat") is not None and request.get("lon") is not None and {"lat", "lon"}.issubset(d.columns):
        lat = pd.to_numeric(d["lat"], errors="coerce")
        lon = pd.to_numeric(d["lon"], errors="coerce")
        gps = haversine_km(lat, lon, float(request["lat"]), float(request["lon"]))
        d["distance_km"] = gps.where(lat.notna() & lon.notna(), d["distance_km"])  # exact GPS when present
    d["distance_km"] = d["distance_km"].fillna(d["distance_km"].median() if d["distance_km"].notna().any() else 500.0)

    d["urgency_level"] = URGENCY_LEVEL[str(request["urgency"]).upper()]
    d["units_required"] = int(request.get("units_required", 1))
    d["hemoglobin"] = d["hemoglobin"].fillna(d["hemoglobin"].median())
    return d


def hard_filter(donors: pd.DataFrame, request: dict) -> pd.DataFrame:
    """Safety rules that must NEVER be left to ML: compatible group + medically eligible."""
    ok = donors["blood_group"].map(lambda g: is_compatible(request["blood_group"], g))
    ok &= donors["eligible"].astype(bool)
    return donors[ok]
