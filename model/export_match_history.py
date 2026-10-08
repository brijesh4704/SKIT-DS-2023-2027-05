import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")

client = MongoClient(MONGO_URI)
db = client["bloodlink_ai"]

collection = db["matchhistories"]

records = list(collection.find())

if not records:
    print("No MatchHistory records found.")
    exit()

rows = []

for record in records:
    donor_features = record.get("donorFeatures", {})
    request_features = record.get("requestFeatures", {})

    donation_successful = record.get("donationSuccessful")

    # ML training ke liye sirf labelled records
    if donation_successful is None:
        continue

    rows.append({
        "bloodGroup": record.get("bloodGroup"),
        "urgency": record.get("urgency"),
        "distance": record.get("distance", 0),
        "matchScore": record.get("matchScore", 0),

        "totalDonations": donor_features.get("totalDonations", 0),
        "responseRate": donor_features.get("responseRate", 0),
        "rating": donor_features.get("rating", 0),
        "medicalEligible": int(
            donor_features.get("medicalEligible", False)
        ),
        "emergencyAvailable": int(
            donor_features.get("emergencyAvailable", False)
        ),
        "isVerified": int(
            donor_features.get("isVerified", False)
        ),

        "unitsRequired": request_features.get(
            "unitsRequired", 1
        ),

        "donorResponse": record.get(
            "donorResponse", "PENDING"
        ),

        "donationSuccessful": int(donation_successful),
    })


df = pd.DataFrame(rows)

os.makedirs("ml/data", exist_ok=True)

output_path = "ml/data/bloodlink_match_history.csv"

df.to_csv(output_path, index=False)

print("BloodLink ML dataset created successfully!")
print("Records:", len(df))
print("Saved at:", output_path)

if len(df) > 0:
    print("\nTarget distribution:")
    print(df["donationSuccessful"].value_counts())

    print("\nDataset preview:")
    print(df.head())
