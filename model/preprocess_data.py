"""
BloodBond — Data Preprocessing
Run from the repository root:
    python ml/preprocess_data.py

Original CSVs are never modified. Cleaned copies and a report are saved under
data/processed/. Review outputs before using them for model training.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "processed"

SOURCE_FILES = [
    "blood_centre.csv",
    "blood_donation.csv",
    "blood_donations.csv",
    "donors.csv",
    "emergency_requests.csv",
    "large_donor_dataset.csv",
    "large_emergency_dataset.csv",
]

NULL_LIKE = {
    "", "na", "n/a", "nan", "none", "null", "nil", "unknown",
    "not available", "not applicable",
}

BLOOD_GROUP_MAP = {
    "A POSITIVE": "A+", "A POS": "A+", "A+": "A+",
    "A NEGATIVE": "A-", "A NEG": "A-", "A-": "A-",
    "B POSITIVE": "B+", "B POS": "B+", "B+": "B+",
    "B NEGATIVE": "B-", "B NEG": "B-", "B-": "B-",
    "AB POSITIVE": "AB+", "AB POS": "AB+", "AB+": "AB+",
    "AB NEGATIVE": "AB-", "AB NEG": "AB-", "AB-": "AB-",
    "O POSITIVE": "O+", "O POS": "O+", "O+": "O+",
    "O NEGATIVE": "O-", "O NEG": "O-", "O-": "O-",
}


def clean_cell(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    value = value.strip()
    return pd.NA if value.casefold() in NULL_LIKE else value


def normalize_blood_group(value: Any) -> Any:
    if not isinstance(value, str) or pd.isna(value):
        return value
    key = re.sub(r"\s+", " ", value.strip().upper())
    return BLOOD_GROUP_MAP.get(key, value.strip().upper())


def clean_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    original_rows, original_cols = df.shape
    out = df.copy()
    out.columns = [str(c).strip() for c in out.columns]

    unnamed = [
        c for c in out.columns
        if c.casefold().startswith("unnamed:") or not c.strip()
    ]
    out = out.drop(columns=unnamed, errors="ignore")

    for col in out.columns:
        out[col] = out[col].map(clean_cell)

    rows_before = len(out)
    out = out.dropna(how="all")
    empty_rows_removed = rows_before - len(out)

    empty_cols = [c for c in out.columns if out[c].isna().all()]
    out = out.drop(columns=empty_cols, errors="ignore")

    blood_group_cols = [
        c for c in out.columns
        if "blood" in c.casefold()
        and ("group" in c.casefold() or "type" in c.casefold())
    ]
    for col in blood_group_cols:
        out[col] = out[col].map(normalize_blood_group)

    before_duplicates = len(out)
    out = out.drop_duplicates().reset_index(drop=True)

    report = {
        "original_rows": original_rows,
        "cleaned_rows": len(out),
        "original_columns": original_cols,
        "cleaned_columns": len(out.columns),
        "empty_rows_removed": empty_rows_removed,
        "exact_duplicate_rows_removed": before_duplicates - len(out),
        "unnamed_columns_removed": len(unnamed),
        "empty_columns_removed": len(empty_cols),
        "blood_group_columns_normalized": ", ".join(blood_group_cols),
        "missing_cells_after_cleaning": int(out.isna().sum().sum()),
    }
    return out, report


def main() -> None:
    if not DATA_DIR.exists():
        raise SystemExit(f"Data folder not found: {DATA_DIR}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summaries = []

    for filename in SOURCE_FILES:
        source = DATA_DIR / filename
        if not source.exists():
            print(f"SKIP  {filename} — file not found")
            continue

        try:
            df = pd.read_csv(source, low_memory=False)
            cleaned, summary = clean_dataframe(df)
            destination = OUTPUT_DIR / filename
            cleaned.to_csv(destination, index=False)
            summary["source_file"] = filename
            summary["output_file"] = str(destination.relative_to(ROOT))
            summaries.append(summary)
            print(
                f"OK    {filename}: {summary['original_rows']} -> "
                f"{summary['cleaned_rows']} rows; "
                f"{summary['exact_duplicate_rows_removed']} exact duplicates removed"
            )
        except Exception as exc:
            print(f"ERROR {filename}: {exc}")
            summaries.append({"source_file": filename, "error": str(exc)})

    report_path = OUTPUT_DIR / "preprocessing_report.csv"
    pd.DataFrame(summaries).to_csv(report_path, index=False)
    successful = sum("error" not in item for item in summaries)
    print(f"\nProcessed files: {successful}")
    print(f"Report saved to: {report_path}")


if __name__ == "__main__":
    main()
