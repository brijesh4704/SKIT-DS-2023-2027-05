"""Sprint task: Data preprocessing.  Run:  python preprocess_data.py
Raw CSVs are never modified; cleaned copies go to data/processed/.

Fixes vs. the old script:
  * the text 'None' in Medical_Condition is a REAL value ("no condition"),
    not a missing value, so it is kept;
  * output uses one standard column naming used by features.py.
"""
import re
import pandas as pd
from config import DATA, DONOR_FILE, EMERGENCY_FILE

OUT = DATA / "processed"
OUT.mkdir(exist_ok=True)

BG = {"A POSITIVE": "A+", "A POS": "A+", "A NEGATIVE": "A-", "A NEG": "A-",
      "B POSITIVE": "B+", "B POS": "B+", "B NEGATIVE": "B-", "B NEG": "B-",
      "AB POSITIVE": "AB+", "AB POS": "AB+", "AB NEGATIVE": "AB-", "AB NEG": "AB-",
      "O POSITIVE": "O+", "O POS": "O+", "O NEGATIVE": "O-", "O NEG": "O-"}
VALID_BG = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


def norm_bg(x):
    if not isinstance(x, str):
        return None
    k = re.sub(r"\s+", " ", x.strip().upper())
    k = BG.get(k, k)
    return k if k in VALID_BG else None


def clean_donors() -> pd.DataFrame:
    raw = pd.read_csv(DONOR_FILE, keep_default_na=False, na_values=[""])
    n0 = len(raw)
    d = pd.DataFrame({
        "donor_id": raw["Donor_ID"],
        "blood_group": raw["Blood_Group"].map(norm_bg),
        "city": raw["City"].str.strip(),
        "gender": raw["Gender"].str.strip().str.title(),
        "age": pd.to_numeric(raw["Age"], errors="coerce"),
        "weight_kg": pd.to_numeric(raw["Weight_kg"], errors="coerce"),
        "hemoglobin": pd.to_numeric(raw["Hemoglobin_g_dL"], errors="coerce"),
        "total_donations": pd.to_numeric(raw["Total_Donations"], errors="coerce").fillna(0).astype(int),
        "last_donation_date": pd.to_datetime(raw["Last_Donation_Date"], format="%d-%m-%Y", errors="coerce"),
        "eligible": raw["Eligible_for_Donation"].str.strip().str.lower().eq("yes"),
        "medical_condition": raw["Medical_Condition"].fillna("None"),
        "contact": raw["Contact_Number"].astype(str).str.strip(),
    })
    d = d.dropna(subset=["blood_group", "city"])
    d = d.drop_duplicates("donor_id")
    d["phone_valid"] = d["contact"].str.fullmatch(r"[6-9]\d{9}")  # Indian mobile format
    d.to_csv(OUT / "donors_clean.csv", index=False)
    print(f"donors: {n0} -> {len(d)} rows | invalid phone numbers: {(~d['phone_valid']).sum()}")
    return d


def clean_requests() -> pd.DataFrame:
    raw = pd.read_csv(EMERGENCY_FILE)
    r = pd.DataFrame({
        "request_id": raw["RequestID"],
        "blood_group": raw["BloodGroup"].map(norm_bg),
        "city": raw["City"].str.strip(),
        "urgency": raw["Urgency"].str.strip().str.upper(),
    }).dropna().drop_duplicates("request_id")
    r.to_csv(OUT / "requests_clean.csv", index=False)
    print(f"requests: {len(raw)} -> {len(r)} rows")
    return r


if __name__ == "__main__":
    clean_donors()
    clean_requests()
    print("saved to", OUT)
