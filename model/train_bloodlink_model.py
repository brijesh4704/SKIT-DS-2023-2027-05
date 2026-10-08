import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier


DATA_PATH = "ml/data/bloodlink_match_history.csv"
MODEL_PATH = "ml/models/bloodlink_donor_model.pkl"


df = pd.read_csv(DATA_PATH)

print("Dataset loaded:", df.shape)

target = "donationSuccessful"

# ML ke liye sirf labelled data
df = df[df[target].notna()].copy()

if len(df) < 20:
    print(
        f"\nNot enough labelled data for training. "
        f"Currently available: {len(df)} records."
    )
    print("Minimum recommended: 20+ records.")
    exit()

if df[target].nunique() < 2:
    print("\nTraining stopped.")
    print("Dataset must contain both successful (1) and unsuccessful (0) donations.")
    exit()

features = [
    "bloodGroup",
    "urgency",
    "distance",
    "matchScore",
    "totalDonations",
    "responseRate",
    "rating",
    "medicalEligible",
    "emergencyAvailable",
    "isVerified",
    "unitsRequired",
    "donorResponse",
]

X = df[features]
y = df[target].astype(int)

categorical_features = [
    "bloodGroup",
    "urgency",
    "donorResponse",
]

numeric_features = [
    "distance",
    "matchScore",
    "totalDonations",
    "responseRate",
    "rating",
    "medicalEligible",
    "emergencyAvailable",
    "isVerified",
    "unitsRequired",
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features,
        ),
        (
            "numeric",
            "passthrough",
            numeric_features,
        ),
    ]
)

model = XGBClassifier(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
    random_state=42,
)

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model),
    ]
)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

pipeline.fit(X_train, y_train)

predictions = pipeline.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\nBloodLink XGBoost Model")
print("-----------------------")
print("Training records:", len(X_train))
print("Testing records:", len(X_test))
print("Accuracy:", round(accuracy, 4))

print("\nClassification Report:")
print(classification_report(y_test, predictions))

os.makedirs("ml/models", exist_ok=True)

joblib.dump(pipeline, MODEL_PATH)

print("\nBloodLink ML model saved successfully!")
print("Model:", MODEL_PATH)