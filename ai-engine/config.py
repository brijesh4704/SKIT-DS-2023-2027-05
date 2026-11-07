"""Shared path and training configuration for BloodLink AI service and scripts."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "model"
REPORTS = BASE_DIR / "reports"

PAIRS_FILE = DATA_DIR / "match_pairs.csv"
MATCH_MODEL = MODEL_DIR / "donor_match_model.pkl"
DEMAND_MODEL = MODEL_DIR / "demand_forecast_model.pkl"

RANDOM_STATE = 42
