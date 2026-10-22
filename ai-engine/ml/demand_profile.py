import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
df = pd.read_csv(ROOT / "data" / "emergency_requests.csv")

profile = (
    df.groupby("BloodGroup")
      .agg(
          Emergency_Requests=("RequestID", "count"),
          High_Urgency=("Urgency", lambda s: (s == "High").sum()),
          Medium_Urgency=("Urgency", lambda s: (s == "Medium").sum()),
          Low_Urgency=("Urgency", lambda s: (s == "Low").sum()),
      )
      .reset_index()
)
profile["High_Urgency_Rate"] = (
    profile["High_Urgency"] / profile["Emergency_Requests"]
).round(4)
profile = profile.sort_values("Emergency_Requests", ascending=False)
profile.to_csv(ROOT / "ml" / "emergency_demand_profile.csv", index=False)
print(profile.to_string(index=False))
