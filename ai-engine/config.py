"""Single place for paths and constants so every script works from any folder."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"
for p in (MODELS, REPORTS):
    p.mkdir(exist_ok=True)

DONOR_FILE = DATA / "blood_donation.csv"
EMERGENCY_FILE = DATA / "large_emergency_dataset.csv"
PAIRS_FILE = DATA / "processed" / "donor_request_pairs.csv"
HISTORY_FILE = DATA / "request_history.csv"
MATCH_MODEL = MODELS / "donor_match_model.pkl"
DEMAND_MODEL = MODELS / "demand_forecast.pkl"

# NBTC (India): whole-blood gap = 3 months men, 4 months women
MIN_GAP_DAYS = {"Male": 90, "Female": 120, "Other": 120}
RANDOM_STATE = 42
