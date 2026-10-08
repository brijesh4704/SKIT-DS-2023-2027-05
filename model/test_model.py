import joblib
import pandas as pd

# Load saved model
model = joblib.load("ml/models/xgboost_donor_model.pkl")

# Test donor data
donor = pd.DataFrame([
    {
        "Recency (months)": 2,
        "Frequency (times)": 10,
        "Monetary (c.c. blood)": 2500,
        "Time (months)": 24
    }
])

# Prediction
prediction = model.predict(donor)[0]
probability = model.predict_proba(donor)[0][1]

print("Prediction:", prediction)
print("Donation Probability:", round(probability, 4))
