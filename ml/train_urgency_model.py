import json
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
df = pd.read_csv(ROOT / "data" / "emergency_requests.csv")

X = df[["BloodGroup", "City"]]
y = df["Urgency"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

preprocessor = ColumnTransformer([
    ("categorical", OneHotEncoder(handle_unknown="ignore"),
     ["BloodGroup", "City"])
])

model = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(
        n_estimators=200, random_state=42, class_weight="balanced"
    )),
])

model.fit(X_train, y_train)
pred = model.predict(X_test)

metrics = {
    "accuracy": round(float(accuracy_score(y_test, pred)), 4),
    "classification_report": classification_report(
        y_test, pred, output_dict=True
    ),
}

with open(ROOT / "ml" / "model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

print(f"Accuracy: {metrics['accuracy']}")
print(classification_report(y_test, pred))
print(
    "\nNote: this is an exploratory urgency-classification baseline, "
    "not a production blood-demand forecasting model."
)
