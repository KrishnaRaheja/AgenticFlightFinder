# Design: Default Alert Frequency to Weekly

**Date:** 2026-05-16
**Issue:** [#35 - Set alert preference to weekly by default instead of daily](https://github.com/KrishnaRaheja/AgenticFlightFinder/issues/35)
**Status:** Approved

## Summary

Change the default `alert_frequency` from `"daily"` to `"weekly"` for newly created trackers. No existing preferences are affected.

## Motivation

Daily alerts can feel overwhelming for users who haven't consciously opted in to that cadence. Weekly is a more conservative, user-friendly default that reduces notification fatigue while still keeping users informed.

## Scope

- Applies only to **newly created** trackers going forward.
- No database migration or backfill of existing preferences.

## Changes

| File | Location | Change |
|---|---|---|
| `backend/schemas.py` | Line 32 | `alert_frequency: Literal["daily", "weekly"] = "daily"` → `= "weekly"` |
| `frontend/src/components/PreferenceWizard.tsx` | Line 32 (`DEFAULT_DATA`) | `alert_frequency: 'daily'` → `alert_frequency: 'weekly'` |

## Data Flow

When a user opens the PreferenceWizard, `DEFAULT_DATA` pre-selects "Weekly" in the Alert Frequency dropdown. If the user doesn't change it and submits, the frontend sends `alert_frequency: "weekly"`. The backend schema also defaults to `"weekly"` for any API call that omits the field. Both layers agree.

## Files Not Changing

- `frontend/src/pages/HomePage.tsx` — only displays the stored value, no default involved
- `frontend/src/types.ts` — type definition only, no default value
- `backend/system_prompt.md` — already documents the default as weekly (line 31), so it's already correct

## Error Handling / Edge Cases

None. This is a pure default value change with no conditional logic.

## Testing

1. Open the PreferenceWizard (create new tracker).
2. Navigate to the Preferences step.
3. Verify the Alert Frequency dropdown pre-selects "Weekly" without any user interaction.
4. Submit the form without changing alert frequency.
5. Confirm the saved preference displays `weekly` on the dashboard.
