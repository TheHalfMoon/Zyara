# W1 Provenance — Qdrat Workforce Adaptation

## Donor

- Repository: `TheHalfMoon/Qdrat`
- Evaluated revision: `e2d288940aab52af881786678b2fc86dfa5c272a`
- Founder permission: explicitly stated for reuse.
- W1 admission mode: **SEMANTIC ADAPTATION / NO DIRECT CODE COPY**.

## Concepts adapted

W1 uses Qdrat/Horilla as a product/domain reference for:

- organization-scoped workforce structure;
- departments and teams;
- staff assignments;
- shifts;
- leave requests;
- effective dating and operational status.

No Qdrat/Horilla source file is copied verbatim in W1.

## Zyara-specific changes

- healthcare `Practitioner` / `PractitionerRole` remain separate authorities;
- operational staff role does not imply clinical privilege;
- every record is explicitly tenant-scoped;
- branch relationships are explicit;
- RLS uses both `USING` and `WITH CHECK`;
- source revision/provenance is retained;
- shift overlap, coverage and appointment-resource reconciliation are deferred to W2;
- payroll, recruitment and biometric/geofencing functions are excluded.

## Security / privacy

- no PHI is introduced by this packet;
- leave records intentionally omit free-text medical reasons;
- API tenant comes from verified session claims rather than request bodies;
- membership is supplied only through a trusted server-side adapter and defaults to deny;
- AAL2 is required for workforce administration routes.

## Update strategy

Before any future direct Qdrat code copy:

1. pin exact file and revision;
2. record license/header/NOTICE obligations;
3. review transitive dependencies;
4. run security/privacy review;
5. document modification and patch strategy;
6. prove direct reuse is safer/cheaper than the current native Zyara implementation.
