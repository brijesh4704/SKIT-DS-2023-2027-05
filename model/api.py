from fastapi import FastAPI
from pydantic import BaseModel
import joblib


# =========================
# FastAPI App
# =========================
app = FastAPI(
    title="BloodLink AI ML Service",
    description="XGBoost donor prediction service",
    version="1.0.0"
)


# =========================
# Load Trained Model
# =========================
model = joblib.load(
    "models/xgboost_donor_model.pkl"
)


# =========================
# Input Data
# =========================
class DonorData(BaseModel):
    recency: float
    frequency: float
    monetary: float
    time: float


# =========================
# Health Check
# =========================
@app.get("/")
def home():
    return {
        "success": True,
        "message": "BloodLink AI ML Service is running 🤖🩸"
    }


# =========================
# Prediction
# =========================
@app.post("/predict")
def predict_donation(data: DonorData):

    input_data = [[
        data.recency,
        data.frequency,
        data.monetary,
        data.time
    ]]

    prediction = model.predict(input_data)[0]

    probability = model.predict_proba(input_data)[0][1]

    return {
        "success": True,
        "prediction": int(prediction),
        "donationProbability": round(float(probability), 4)
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
