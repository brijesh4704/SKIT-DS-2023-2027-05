"""Export REAL labelled outcomes from MongoDB for retraining.  Run: python export_match_history.py
.env needs MONGO_URI  (same variable name as the backend - the old script used MONGODB_URI).
Writes data/processed/real_match_history.csv (only rows where donationSuccessful is known).
Also writes data/request_history.csv from BloodRequest.createdAt for forecast_demand.py.
"""
import os
import sys
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from config import DATA, HISTORY_FILE

load_dotenv()
uri = os.getenv("MONGO_URI")
if not uri:
    sys.exit("MONGO_URI missing in .env")
db = MongoClient(uri).get_default_database()   # database name comes from the URI

rows = []
for r in db["matchhistories"].find({"donationSuccessful": {"$ne": None}}):
    f, q = r.get("donorFeatures", {}), r.get("requestFeatures", {})
    rows.append({"bloodGroup": r.get("bloodGroup"), "urgency": r.get("urgency"),
                 "distance_km": r.get("distance", 0), "totalDonations": f.get("totalDonations", 0),
                 "responseRate": f.get("responseRate", 0), "rating": f.get("rating", 0),
                 "emergencyAvailable": int(f.get("emergencyAvailable", False)),
                 "isVerified": int(f.get("isVerified", False)),
                 "unitsRequired": q.get("unitsRequired", 1),
                 # NOTE: matchScore and donorResponse are deliberately NOT exported - they are
                 # rule output / outcome leakage and would make the model look better than it is.
                 "donationSuccessful": int(r["donationSuccessful"])})
pd.DataFrame(rows).to_csv(DATA / "processed" / "real_match_history.csv", index=False)
print("real labelled match records:", len(rows))

req = [{"date": r["createdAt"], "bloodGroup": r["bloodGroup"], "units": r.get("unitsRequired", 1)}
       for r in db["bloodrequests"].find({}, {"createdAt": 1, "bloodGroup": 1, "unitsRequired": 1})]
pd.DataFrame(req).to_csv(HISTORY_FILE, index=False)
print("request history rows:", len(req))
