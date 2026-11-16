# BloodBond AI Engine (Brijesh - AI Developer)

Sprint 3 - AI-based Donor Matching System (Form-2 plan)

| Form-2 task | File |
|---|---|
| Database collection | `data/` (+ `export_match_history.py` for real data from MongoDB) |
| Data preprocessing | `preprocess_data.py` |
| Feature engineering (blood group, distance, availability) | `features.py`, `build_training_data.py` |
| XGBoost matching model | `train_donor_match_model.py` |
| Model evaluation (precision, recall, accuracy) | same script -> `reports/` |
| Blood demand prediction | `forecast_demand.py` |
| AI API integration | `api.py`, `docs/INTEGRATION.md` |
| AI model testing | `tests/test_ai.py` |

## Run (from this folder)
```bash
pip install -r requirements.txt
python preprocess_data.py
python build_training_data.py
python train_donor_match_model.py
python forecast_demand.py --simulate     # demo only; use export_match_history.py for real data
pytest -q
uvicorn api:app --port 8000
```

## Design (one paragraph for the report/viva)
Safety rules are NOT left to ML: a hard filter keeps only blood-group-compatible, medically
eligible donors. The ML model then ranks the remaining donors by predicted probability of
responding, using distance, exact-group match, donation gap, donation history, urgency and units.
The 3-month (men) / 4-month (women) donation gap follows NBTC guidelines.

## Honest limitations
* Response labels are **simulated** until the app collects real `MatchHistory.donationSuccessful`.
  Reported metrics prove the pipeline, not real-world accuracy.
* The demand forecast uses **synthetic** history until real `BloodRequest` timestamps exist.
* City-centre coordinates are used when exact GPS is missing.
* `contact` numbers in `blood_donation.csv` are mostly not valid Indian mobile numbers - never use them for real SMS.
