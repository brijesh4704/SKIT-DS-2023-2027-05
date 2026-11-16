"""Sprint task: Blood demand prediction.  Run:  python forecast_demand.py [--simulate]

Predicts WEEKLY units of blood requested, per blood group, for the next 4 weeks.
Needs a time series -> data/request_history.csv  (date, bloodGroup, units).
  * Real source : python export_request_history.py   (BloodRequest.createdAt from MongoDB)
  * Demo source : --simulate  writes a clearly-labelled SYNTHETIC history so the pipeline
                  can be developed/tested before the app has months of real requests.
The old emergency CSV has no date column, so it cannot be used for forecasting.

Model is compared against two naive baselines (last week, 4-week mean) on a time-ordered
split (last 12 weeks held out). A forecasting model that cannot beat the baselines is
not worth shipping - so the comparison is printed every run.
"""
import argparse
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from config import HISTORY_FILE, DEMAND_MODEL, REPORTS, RANDOM_STATE

GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
SHARE = {"O+": .37, "B+": .32, "A+": .22, "AB+": .07, "O-": .02, "B-": .02, "A-": .01, "AB-": .01}


def simulate_history(weeks=104, seed=RANDOM_STATE) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    start = pd.Timestamp("2025-01-06")
    rows = []
    for w in range(weeks):
        season = 1 + 0.25 * np.sin(2 * np.pi * w / 52)          # yearly cycle
        trend = 1 + 0.004 * w                                    # slow growth
        for g in GROUPS:
            lam = max(0.5, 60 * SHARE[g] * season * trend)
            rows.append({"date": start + pd.Timedelta(weeks=w), "bloodGroup": g,
                         "units": int(rng.poisson(lam)), "source": "SYNTHETIC"})
    return pd.DataFrame(rows)


def make_supervised(weekly: pd.DataFrame) -> pd.DataFrame:
    out = []
    for g, d in weekly.groupby("bloodGroup"):
        d = d.sort_values("week").reset_index(drop=True)
        for k in (1, 2, 3, 4):
            d[f"lag{k}"] = d["units"].shift(k)
        d["mean4"] = d["units"].shift(1).rolling(4).mean()
        woy = d["week"].dt.isocalendar().week.astype(int)
        d["wsin"], d["wcos"] = np.sin(2 * np.pi * woy / 52), np.cos(2 * np.pi * woy / 52)
        d["g"] = GROUPS.index(g)
        out.append(d)
    return pd.concat(out).dropna().reset_index(drop=True)


FEATS = ["lag1", "lag2", "lag3", "lag4", "mean4", "wsin", "wcos", "g"]


def main(simulate: bool):
    if simulate or not HISTORY_FILE.exists():
        simulate_history().to_csv(HISTORY_FILE, index=False)
        print("Wrote SYNTHETIC history ->", HISTORY_FILE, "(replace with real export before reporting results)")
    h = pd.read_csv(HISTORY_FILE, parse_dates=["date"])
    synthetic = "source" in h.columns and (h["source"] == "SYNTHETIC").any()
    h["week"] = h["date"].dt.to_period("W-SUN").dt.start_time
    weekly = h.groupby(["bloodGroup", "week"], as_index=False)["units"].sum()
    data = make_supervised(weekly)

    cut = data["week"].max() - pd.Timedelta(weeks=11)
    tr, te = data[data.week < cut], data[data.week >= cut]
    model = GradientBoostingRegressor(n_estimators=200, max_depth=3, learning_rate=0.05,
                                      random_state=RANDOM_STATE).fit(tr[FEATS], tr["units"])
    mae = {
        "naive_last_week": mean_absolute_error(te["units"], te["lag1"]),
        "mean_4_weeks": mean_absolute_error(te["units"], te["mean4"]),
        "gradient_boosting": mean_absolute_error(te["units"], model.predict(te[FEATS])),
    }
    print("MAE (units/week, lower is better):", {k: round(v, 3) for k, v in mae.items()})

    # refit on everything, forecast next 4 weeks recursively
    model.fit(data[FEATS], data["units"])
    forecast = {}
    for g in GROUPS:
        hist = list(weekly[weekly.bloodGroup == g].sort_values("week")["units"])
        last_week = weekly["week"].max()
        preds = []
        for step in range(1, 5):
            wk = last_week + pd.Timedelta(weeks=step)
            woy = int(wk.isocalendar().week)
            x = pd.DataFrame([{"lag1": hist[-1], "lag2": hist[-2], "lag3": hist[-3], "lag4": hist[-4],
                               "mean4": np.mean(hist[-4:]), "wsin": np.sin(2 * np.pi * woy / 52),
                               "wcos": np.cos(2 * np.pi * woy / 52), "g": GROUPS.index(g)}])
            p = max(0.0, float(model.predict(x[FEATS])[0]))
            preds.append(round(p, 1)); hist.append(p)
        forecast[g] = preds

    joblib.dump({"model": model, "features": FEATS, "forecast": forecast}, DEMAND_MODEL)
    (REPORTS / "demand_forecast.json").write_text(json.dumps(
        {"data_is_synthetic": bool(synthetic), "mae": mae, "next_4_weeks_units": forecast}, indent=2))
    print("Next 4 weeks forecast:", forecast)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--simulate", action="store_true")
    main(ap.parse_args().simulate)
