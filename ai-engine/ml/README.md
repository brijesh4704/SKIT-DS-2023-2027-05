# BloodBond AI/Data Processing — Brijesh

This folder contains the data-processing and exploratory ML work prepared from the supplied BloodBond datasets.

## Datasets used

- `data/blood_centres.csv` — 6,147 blood-centre records
- `data/blood_donations.csv` — 10,000 donor/donation records
- `data/donor_availability.csv` — 1,000 donor-availability records
- `data/emergency_requests.csv` — 1,000 emergency-request records

## Work completed

1. Data profiling and validation.
2. Emergency-request demand profiling by blood group and urgency.
3. Donor-supply profiling by blood group and eligibility.
4. Exploratory urgency-classification baseline using BloodGroup and City.
5. Model evaluation using accuracy and a classification report.

The emergency dataset has no request date/time or quantity field, so a true time-series blood-demand forecast cannot be claimed from these files alone. The model is therefore documented as an **exploratory urgency-classification baseline**.

## Run

From the repository root:

```bash
pip install -r ml/requirements.txt
python ml/demand_profile.py
python ml/donor_supply_profile.py
python ml/train_urgency_model.py
```
