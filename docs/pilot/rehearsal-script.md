# Synthetic rehearsal script (M028)

English only. All cases use synthetic patients from
`fixtures/synthetic/riyadh-clinic.json`. No real records are accessed.

## Case 1 — Native booking

1. Search without signup; open the verified profile.
2. Select the synthetic slot; answer the exact confirmation challenge.
3. Confirm only after the committed response arrives.
4. Verify resume on lost response returns the same appointment.

## Case 2 — Request mode

1. Submit a request for a request-only service.
2. Confirm the UI shows deadline and owner with no false reservation.
3. Decide the request as reception staff; verify the outcome language.

## Case 3 — Unknown insurance and missing referral

1. Enter an unknown insurer; verify coverage is reported unknown, never covered.
2. Omit the referral; verify the explicit next step and staff-review route.

## Case 4 — Cancellation inside and outside cutoff

1. Cancel before cutoff; verify the committed outcome.
2. Attempt cancel after cutoff; verify assistance is offered, not silent failure.

## Case 5 — Provider absence day

1. Preview bulk absence; verify the explicit affected set.
2. Execute with one conflicting appointment; verify per-appointment outcomes
   and that the conflict does not fabricate peer success.

## Case 6 — Attendance dispute

1. Label the synthetic visit no-show as provider staff.
2. Dispute as the synthetic patient; verify the independent reviewer path.
3. Correct the record; verify eligibility re-evaluates.

## Scoring

Each case: pass/fail plus staff notes. Any fail unpublishes the affected
service until repaired and re-rehearsed.
