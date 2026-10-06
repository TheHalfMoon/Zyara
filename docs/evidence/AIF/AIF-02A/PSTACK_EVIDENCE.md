# AIF-02A pstack Evidence

This is a full panel, because the security trigger applies: PHI egress, credential refusal and consent.

## Panel on `6d992fc..a92baa2`

| Judge | Must-fix | Outcome |
| --- | --- | --- |
| correctness + security | getter/Proxy could swap a field, purpose or tenant between checks; M051 string-compared consent instants (mixed formats → a revoked grant looked live); unsalted SHA-256 receipt digests (guessable low-entropy PHI) | fixed in `bc65938`: snapshot once; parsed-instant consent with malformed grants refused; HMAC digests under the tenant key |
| parsimony + product | consent not bound to the data subject; source trust zone not modelled; early denials lost the destination and purpose; §15 evidence missing | fixed in `bc65938`: `subjectId`; `sourceZone`, with both zones receipted; requested refs always echoed (safe shape); this evidence packet |

Worth-considering items applied:

- deny an unknown transform;
- validate retention integers;
- a JWT-prefix pattern;
- bind pseudonyms to the field path;
- remove unused `location` and `MINIMIZATIONS`;
- one denial path;
- a DROP test;
- a test that the key stays out of receipts.

Recorded rather than changed:

- two different required consent purposes in one request deny (fail closed; the packet says to split the request);
- the identifier heuristic has false positives (ISO dates, epoch numbers) in PUBLIC/INTERNAL fields, which fails closed;
- the shared `canonicalJson` copy (see OCR_REVIEW).

## Delta re-reviews

| Cycle | Delta | Result |
| --- | --- | --- |
| 1 | `a92baa2..bc65938` | all items CLOSED (one only by code, not by a test). New must-fix: a `null` request threw. Also non-finite numbers, identifier-shaped echoes, and a path-binding test. Fixed in `04aca23` |
| 2 | `bc65938..04aca23` | all 5 items CLOSED. New must-fix: `echoable` reused the payload heuristic (refused date versions and ~15% of UUIDs), and the gate did not require echoable ids, so an ALLOW receipt could carry `tenantId: "invalid"` and null refs. Fixed in cycle 3: ids use the AIF-01A `isOpaqueToken` rule on the raw string (plus no e-mail), and the gate denies `EGRESS_PAYLOAD_INVALID` up front when an id the receipt must carry is not echoable. Tests cover a UUID tenant, a date version and up-front denials |

The cap was reached. The cycle-3 fix applies the judge's prescription and is proven by tests ("allows UUID tenants and date-versioned refs…", "denies up front when an id…"). No panel re-ran after it; that is recorded here rather than claimed.

## Mechanical gate (candidate)

- tests: AIF-02A 28/28, AIF-01A 37, AIF-01B 50, M051 3;
- typecheck: `privacy-egress`, `capability-gateway`;
- lint: `privacy-egress`, `aif02a-tests`;
- boundaries: clean.
