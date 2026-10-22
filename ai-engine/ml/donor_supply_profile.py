import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
df = pd.read_csv(ROOT / "data" / "blood_donations.csv")

profile = (
    df.groupby("Blood_Group")
      .agg(
          Registered_Donors=("Donor_ID", "count"),
          Eligible_Donors=("Eligible_for_Donation", lambda s: (s == "Yes").sum()),
          Total_Donations=("Total_Donations", "sum"),
      )
      .reset_index()
)
profile["Eligibility_Rate"] = (
    profile["Eligible_Donors"] / profile["Registered_Donors"]
).round(4)
profile.to_csv(ROOT / "ml" / "donor_supply_profile.csv", index=False)
print(profile.to_string(index=False))
