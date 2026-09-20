# W2 Provenance — Coverage Adaptation

## Donor

- Repository: `TheHalfMoon/Qdrat`
- Evaluated revision: `e2d288940aab52af881786678b2fc86dfa5c272a`
- Founder permission: explicitly stated for reuse.
- W2 admission mode: **SEMANTIC ADAPTATION / NO DIRECT CODE COPY**.

## Concepts adapted

W2 uses Qdrat/Horilla as a product/domain reference for:

- shift overlap and schedule conflict visibility;
- leave versus roster conflict review;
- branch coverage gaps as operational review work;
- conservative approval/review transitions.

No Qdrat/Horilla source file is copied verbatim in W2.

## Zyara-specific changes

- detection is read-only over the W1 workforce store;
- coverage records are advisory and cannot mutate scheduling or clinical state;
- every record is explicitly tenant-scoped with branch integrity;
- coverage lifecycle is `open -> acknowledged -> resolved`;
- `Practitioner` / `PractitionerRole` remain separate authorities;
- source revision/provenance is retained.

## Security / privacy

- no PHI is introduced by this packet;
- leave records intentionally omit free-text medical reasons;
- API tenant comes from verified session claims rather than request bodies;
- AAL2 is required for coverage administration routes.
