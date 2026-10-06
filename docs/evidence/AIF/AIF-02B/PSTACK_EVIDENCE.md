# AIF-02B pstack Evidence

The security trigger applies (secrets and keys), so one fresh-context judge carried all four bars: correctness, security, parsimony and product.

## Panel on `a4c0acc..8373af7`

| Must-fix | Outcome (`d5d8b3d`) |
| --- | --- |
| A NaN clock made the lease never expire | the lease fails closed on NaN and on a backwards clock |
| `instant()` threw on an invalid date (health crashed) | NaN check first; health reports INVALID |
| Adapter exceptions carried the secret unredacted | replaced by `adapter failed`, with no message, cause or stack |
| `carriesValue` missed Promise, closure, Map, Set, Buffer, Error, symbol keys and base64 | plain data only, no accessors, base64 checked; `useAsync` added |
| Subject binding was not enforced (handoff §7) | `subject` in the request; `CREDENTIAL_SUBJECT_MISMATCH`; tested |
| Secret-key regex had false negatives and false positives | word tokenization (authToken, X-Api-Key, passphrase and cookie caught; credentialRef, secretary and primaryKey pass) |

Worth-considering items applied:

- non-plain payload values refused;
- the request read once inside the fail-closed path;
- binding fields validated (scopes must be an array);
- credential-shaped ids never echoed;
- a real assertion replaces a silent try/catch in a test;
- tests for every health state.

## Delta re-review (cycle 1, `cd7b3fb..d5d8b3d`)

All 8 items CLOSED, **no must-fix**. Worth-considering items applied in the final commit:

- token counts and limits (`max_tokens`, `inputTokens`) no longer flagged as secrets, since they appear in nearly every LLM request;
- base64url form checked.

Recorded in the packet: encoding at an offset or in hex is not detected (adapters are reviewed code, and isolation is AIF-04/06), and Dates must be ISO strings.

## Mechanical gate (candidate)

AIF-02 suite 54/54 (AIF-02A 28 + AIF-02B 26), AIF-01A 37. Typecheck and lint (`privacy-egress`, `aif02a-tests`) and boundaries: clean.
