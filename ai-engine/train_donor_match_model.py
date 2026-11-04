"""Sprint task: AI model for donor matching + evaluation.  Run:  python train_donor_match_model.py

Compares 3 models on the same split and saves the best one by ROC-AUC.
* Split is by REQUEST (not by row) so candidates of one request never leak across train/test.
* Besides accuracy/precision/recall/F1/ROC-AUC it reports Precision@3 and Hit@3 -
  the metrics that matter for 'recommend the top donors for a request'.
"""
import json
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from config import PAIRS_FILE, MATCH_MODEL, REPORTS, RANDOM_STATE
from features import FEATURES


def topk_metrics(test: pd.DataFrame, prob: np.ndarray, k=3):
    t = test.assign(prob=prob)
    prec, hit = [], []
    for _, g in t.groupby("request_id"):
        top = g.nlargest(k, "prob")
        prec.append(top["label"].mean())
        hit.append(float(top["label"].max() == 1))
    return float(np.mean(prec)), float(np.mean(hit))


def main():
    df = pd.read_csv(PAIRS_FILE)
    X, y, groups = df[FEATURES], df["label"], df["request_id"]
    tr, te = next(GroupShuffleSplit(1, test_size=0.2, random_state=RANDOM_STATE).split(X, y, groups))
    Xtr, Xte, ytr, yte = X.iloc[tr], X.iloc[te], y.iloc[tr], y.iloc[te]
    test_df = df.iloc[te]

    models = {
        "Logistic Regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)),
        "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=8, random_state=RANDOM_STATE),
        "XGBoost": XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, subsample=0.8,
                                 colsample_bytree=0.8, eval_metric="logloss", random_state=RANDOM_STATE),
    }
    results, fitted, curves = [], {}, {}
    for name, m in models.items():
        m.fit(Xtr, ytr)
        prob = m.predict_proba(Xte)[:, 1]
        pred = (prob >= 0.5).astype(int)
        p3, h3 = topk_metrics(test_df, prob)
        results.append({
            "model": name, "accuracy": accuracy_score(yte, pred),
            "precision": precision_score(yte, pred), "recall": recall_score(yte, pred),
            "f1": f1_score(yte, pred), "roc_auc": roc_auc_score(yte, prob),
            "precision_at_3": p3, "hit_at_3": h3,
        })
        fitted[name] = m
        curves[name] = roc_curve(yte, prob)[:2]

    res = pd.DataFrame(results).round(4)
    print(res.to_string(index=False))
    best = res.sort_values("roc_auc", ascending=False).iloc[0]["model"]
    print("\nBest model by ROC-AUC:", best)

    base = float(yte.mean())
    joblib.dump({"model": fitted[best], "features": FEATURES, "name": best}, MATCH_MODEL)

    out = {"best_model": best, "test_rows": int(len(yte)), "positive_rate_test": round(base, 4),
           "label_source": "simulated (replace with real MatchHistory outcomes when available)",
           "results": res.to_dict(orient="records")}
    (REPORTS / "match_model_metrics.json").write_text(json.dumps(out, indent=2))

    plt.figure(figsize=(7, 5))
    for n, (fpr, tpr) in curves.items():
        plt.plot(fpr, tpr, label=f"{n} (AUC {res.set_index('model').loc[n, 'roc_auc']:.2f})")
    plt.plot([0, 1], [0, 1], "k--", label="Random")
    plt.xlabel("False positive rate"); plt.ylabel("True positive rate")
    plt.title("Donor-match model: ROC curves"); plt.legend(); plt.tight_layout()
    plt.savefig(REPORTS / "roc_curves.png", dpi=150); plt.close()

    ax = res.set_index("model")[["precision", "recall", "f1", "roc_auc"]].plot.bar(figsize=(8, 5), rot=0)
    ax.set_ylim(0, 1); ax.set_title("Model comparison"); plt.tight_layout()
    plt.savefig(REPORTS / "model_comparison.png", dpi=150); plt.close()

    xgb = fitted["XGBoost"]
    imp = pd.Series(xgb.feature_importances_, index=FEATURES).sort_values()
    imp.plot.barh(figsize=(7, 5), title="XGBoost feature importance"); plt.tight_layout()
    plt.savefig(REPORTS / "feature_importance.png", dpi=150); plt.close()
    print("saved model ->", MATCH_MODEL)


if __name__ == "__main__":
    main()
