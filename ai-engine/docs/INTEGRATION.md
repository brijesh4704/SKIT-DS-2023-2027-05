# Connecting the AI service to the Node backend (Form-2: "AI API integration")

1. Start the service:  `cd ai-engine && uvicorn api:app --port 8000`
2. In `backend/.env` add `AI_SERVICE_URL=http://127.0.0.1:8000`
3. In `backend/src/services/aiMatchingService.js` call it, with a **fallback** to the existing
   rule-based ranking so an emergency never fails because the ML service is down:

```js
// Node 18+ has fetch built in - no extra package needed
async function rankWithAI(bloodRequest, donors) {
  try {
    const res = await fetch(`${process.env.AI_SERVICE_URL}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        blood_group: bloodRequest.bloodGroup,
        city: bloodRequest.city,
        urgency: bloodRequest.urgency,
        units_required: bloodRequest.unitsRequired,
        lat: bloodRequest.location.coordinates.latitude,
        lon: bloodRequest.location.coordinates.longitude,
        donors: donors.map(d => ({
          donor_id: String(d._id),
          blood_group: d.bloodGroup,
          city: d.location.city,
          gender: (d.gender || "OTHER").toLowerCase() === "male" ? "Male" : "Female",
          total_donations: d.totalDonations || 0,
          last_donation_date: d.lastDonationDate ? d.lastDonationDate.toISOString().slice(0, 10) : null,
          eligible: d.medicalEligible && d.isAvailable,
          lat: d.location.coordinates?.latitude,
          lon: d.location.coordinates?.longitude,
        })),
      }),
    });
    if (!res.ok) throw new Error(`AI service ${res.status}`);
    return (await res.json()).matches;      // [{donor_id, matchScore, distance_km, ...}]
  } catch (err) {
    console.warn("AI service unavailable, using rule-based ranking:", err.message);
    return null;                            // caller falls back to its existing logic
  }
}
```
4. Store the returned `matchScore` / `response_probability` in `MatchHistory`; when a donor
   accepts/donates, set `donationSuccessful` - that is the REAL training label for later retraining.

Missing in the repo right now (the controller imports them, so the backend will not start):
`models/MatchHistory.js`, `services/aiMatchingService.js`, `models/Donation.js`, `models/Notification.js`,
`models/InventoryTransaction.js`, `models/BloodInventory.js`, `services/pushNotificationService.js`.
