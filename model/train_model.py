import pandas as pd
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier


# =========================
# Load Dataset
# =========================
df = pd.read_csv("ml/data/transfusion.data")

X = df[
    [
        "Recency (months)",
        "Frequency (times)",
        "Monetary (c.c. blood)",
        "Time (months)",
    ]
]

y = df["whether he/she donated blood in March 2007"]


# =========================
# Train/Test Split
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)


# =========================
# Models
# =========================
models = {
    "Decision Tree": DecisionTreeClassifier(
        max_depth=5,
        class_weight="balanced",
        random_state=42
    ),

    "Random Forest": RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        class_weight="balanced",
        random_state=42
    ),

    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=3,
        random_state=42
    ),

    "XGBoost": XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42
    ),
}


# =========================
# Train & Evaluate
# =========================
results = []

for name, model in models.items():

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_prob)

    results.append({
        "Model": name,
        "Accuracy": accuracy,
        "ROC-AUC": roc_auc
    })

    print(f"\n===== {name} =====")
    print("Accuracy:", round(accuracy, 4))
    print("ROC-AUC:", round(roc_auc, 4))

    # Save only XGBoost model
    if name == "XGBoost":
        joblib.dump(
            model,
            "ml/models/xgboost_donor_model.pkl"
        )

        print("XGBoost model saved successfully!")


# =========================
# Comparison Table
# =========================
results_df = pd.DataFrame(results)

print("\n\n===== MODEL COMPARISON =====")
print(results_df.to_string(index=False))


# =========================
# Accuracy Graph
# =========================
plt.figure(figsize=(9, 5))

plt.bar(
    results_df["Model"],
    results_df["Accuracy"]
)

plt.ylim(0, 1)

plt.title("Model Accuracy Comparison")
plt.ylabel("Accuracy")
plt.xlabel("Model")

plt.xticks(rotation=15)

plt.tight_layout()

plt.savefig("ml/accuracy_comparison.png")

plt.show()


# =========================
# ROC-AUC Graph
# =========================
plt.figure(figsize=(9, 5))

plt.bar(
    results_df["Model"],
    results_df["ROC-AUC"]
)

plt.ylim(0, 1)

plt.title("Model ROC-AUC Comparison")
plt.ylabel("ROC-AUC")
plt.xlabel("Model")

plt.xticks(rotation=15)

plt.tight_layout()

plt.savefig("ml/roc_auc_comparison.png")

plt.show()
