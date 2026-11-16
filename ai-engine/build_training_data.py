"""Sprint task: Feature engineering.  Run:  python build_training_data.py

Builds one row per (emergency request, candidate donor):
  1. hard safety filter  -> compatible blood group AND medically eligible
  2. features            -> distance, exact-group, donation gap, history, urgency ...
  3. label               -> did the donor respond & donate?

IMPORTANT (be honest in viva/report): the project has no real response outcomes yet,
so the label here is SIMULATED from a documented behaviour rule + noise
(label_source = 'simulated'). It proves the pipeline end-to-end. Once the app has
real MatchHistory records (donationSuccessful), export them with
export_match_history.py and retrain -> then metrics are real.
"""
import numpy as np
import pandas as pd
from config import DATA, RANDOM_STATE, PAIRS_FILE
from features import build_features, hard_filter, FEATURES

CANDIDATES_PER_REQUEST = 15


def simulate_label(f: pd.DataFrame, rng) -> np.ndarray:
    logit = (
        0.3
        - 0.0030 * f["distance_km"].clip(upper=1500)   # far donors rarely come
        + 0.9 * f["gap_ok"]                              # rested donors respond more
        + 0.5 * f["exact_group"]
        + 0.35 * f["urgency_level"]                      # emergencies create motivation
        + 0.10 * f["total_donations"].clip(upper=10)     # experienced donors
    )
    p = 1 / (1 + np.exp(-logit))
    return (rng.random(len(f)) < p).astype(int)


def main():
    rng = np.random.default_rng(RANDOM_STATE)
    donors = pd.read_csv(DATA / "processed" / "donors_clean.csv", parse_dates=["last_donation_date"])
    requests = pd.read_csv(DATA / "processed" / "requests_clean.csv")
    ref_date = donors["last_donation_date"].max() + pd.Timedelta(days=30)  # fixed "today" => reproducible

    rows = []
    for req in requests.itertuples():
        request = {"blood_group": req.blood_group, "city": req.city,
                   "urgency": req.urgency, "units_required": int(rng.integers(1, 4)),
                   "today": ref_date}
        pool = hard_filter(donors, request)
        if len(pool) < 3:
            continue
        cand = pool.sample(min(CANDIDATES_PER_REQUEST, len(pool)), random_state=int(req.request_id))
        f = build_features(cand, request)
        f["request_id"] = req.request_id
        f["label"] = simulate_label(f, rng)
        rows.append(f[["request_id", "donor_id", *FEATURES, "label"]])

    pairs = pd.concat(rows, ignore_index=True)
    pairs["label_source"] = "simulated"
    PAIRS_FILE.parent.mkdir(exist_ok=True)
    pairs.to_csv(PAIRS_FILE, index=False)
    print("pairs:", pairs.shape, "| requests:", pairs.request_id.nunique())
    print("positive rate:", round(pairs.label.mean(), 3))
    print("saved:", PAIRS_FILE)


if __name__ == "__main__":
    main()
