# Default Alert Frequency to Weekly — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the default `alert_frequency` from `"daily"` to `"weekly"` for newly created flight trackers, so new users start with a less overwhelming notification cadence.

**Architecture:** Two one-word default value changes in two files — the backend Pydantic schema (covers API-level default) and the frontend wizard constant (controls what the UI pre-selects). Both must agree so no layer silently reverts the other.

**Tech Stack:** Python / Pydantic (backend), TypeScript / React (frontend)

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `backend/schemas.py` | `alert_frequency` field default: `"daily"` → `"weekly"` |
| Modify | `frontend/src/components/PreferenceWizard.tsx` | `DEFAULT_DATA.alert_frequency`: `'daily'` → `'weekly'` |
| Create | `testing/test_schema_defaults.py` | New test script asserting the backend schema default |

---

## Task 1: Verify the backend default is currently "daily"

**Files:**
- Read: `backend/schemas.py`

- [ ] **Step 1: Confirm current state**

Open `backend/schemas.py` and locate line 32. Confirm it reads:

```python
alert_frequency: Literal["daily", "weekly"] = "daily"
```

This confirms what we are about to change and sets a baseline before writing the failing test.

---

## Task 2: Write a failing test for the backend schema default

**Files:**
- Create: `testing/test_schema_defaults.py`

- [ ] **Step 1: Write the test**

Create `testing/test_schema_defaults.py` with this content:

```python
"""
Test that FlightPreferenceCreate schema defaults are correct.
Run with: python testing/test_schema_defaults.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.schemas import FlightPreferenceCreate


def test_alert_frequency_default_is_weekly():
    pref = FlightPreferenceCreate(
        origin="JFK",
        destination="LAX",
        departure_period="2026-08-01",
    )
    assert pref.alert_frequency == "weekly", (
        f"Expected default 'weekly', got '{pref.alert_frequency}'"
    )
    print("PASS: alert_frequency default is 'weekly'")


if __name__ == "__main__":
    test_alert_frequency_default_is_weekly()
    print("\nAll schema default tests passed.")
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
python testing/test_schema_defaults.py
```

Expected output:
```
AssertionError: Expected default 'weekly', got 'daily'
```

---

## Task 3: Fix the backend schema default

**Files:**
- Modify: `backend/schemas.py:32`

- [ ] **Step 1: Change the default value**

In `backend/schemas.py`, change line 32 from:

```python
alert_frequency: Literal["daily", "weekly"] = "daily"
```

to:

```python
alert_frequency: Literal["daily", "weekly"] = "weekly"
```

- [ ] **Step 2: Run the test and confirm it passes**

```bash
python testing/test_schema_defaults.py
```

Expected output:
```
PASS: alert_frequency default is 'weekly'

All schema default tests passed.
```

- [ ] **Step 3: Commit**

```bash
git add backend/schemas.py testing/test_schema_defaults.py
git commit -m "fix: default alert_frequency to weekly in backend schema"
```

---

## Task 4: Fix the frontend wizard default

**Files:**
- Modify: `frontend/src/components/PreferenceWizard.tsx:32`

- [ ] **Step 1: Change the DEFAULT_DATA value**

In `frontend/src/components/PreferenceWizard.tsx`, change line 32 from:

```typescript
const DEFAULT_DATA: WizardData = {
  origin: '', destination: '', departure_period: '', return_period: '',
  budget: '', max_stops: '2', cabin_class: 'economy', date_flexibility: 'exact',
  nearby_airports: false, priority: 'balanced', alert_frequency: 'daily',
  additional_context: '',
}
```

to:

```typescript
const DEFAULT_DATA: WizardData = {
  origin: '', destination: '', departure_period: '', return_period: '',
  budget: '', max_stops: '2', cabin_class: 'economy', date_flexibility: 'exact',
  nearby_airports: false, priority: 'balanced', alert_frequency: 'weekly',
  additional_context: '',
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Manual verification**

Start the dev server (`npm run dev` in `frontend/`) and open the PreferenceWizard. Navigate to the Preferences step. Confirm the Alert Frequency dropdown shows **"Weekly"** pre-selected without any interaction.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/PreferenceWizard.tsx
git commit -m "fix: default alert_frequency to weekly in PreferenceWizard"
```

---

## Task 5: Close the GitHub issue

- [ ] **Step 1: Close issue #35**

```bash
gh issue close 35 --repo KrishnaRaheja/AgenticFlightFinder --comment "Fixed in two commits: backend schema default and frontend wizard default both changed from 'daily' to 'weekly'. Applies to newly created trackers only — existing preferences are unchanged."
```
