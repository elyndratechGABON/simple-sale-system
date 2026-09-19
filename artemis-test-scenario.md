# ARTEMIS Test Scenario — ELYNDRA CAISSE (Option A - Browser)
Profile: flash
Target: http://localhost:8080/

Steps: navigate /, click create account, onboarding, /pos, add rental product, open checkout, select period week, enter return date 2026-10-15, validate cashing, verify reminder banner on /stocks.
Expected: expected_return_date saved; total *7; reminder shown.
