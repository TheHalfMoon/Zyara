# Competitive Landscape

Research snapshot: 2026-09-11.

Zyara should study competitors for product patterns, not copy their positioning wholesale.

## Primary references

| Product | What it demonstrates | Zyara response | Official/reference URL |
|---|---|---|---|
| Doctolib | Large-scale scheduling, patient journey, health companion direction, health-data continuity | Combine care access with stronger map/search and explainable AI navigation | https://about.doctolib.com/patients/ |
| Zocdoc | Insurance-aware search, real-time availability, verified reviews, provider integrations | Match trust and availability while expanding to map-first local healthcare graph | https://www.zocdoc.com/patient-help/en/articles/8724654-how-does-zocdoc-work |
| Zocdoc Reviews | Closed-loop patient review model | Verified-encounter reviews and representative feedback | https://www.zocdoc.com/about/verifiedreviews/ |
| Vezeeta | MENA localization, specialties, insurance, location, booking, telehealth, verified patient reviews | Saudi-native discovery/trust with broader provider graph and provider analytics | https://saudi.vezeeta.com/en |
| Okadoc | GCC provider profiles, real-time booking, HIS integration, notifications, hybrid care | Treat integration as a paid maturity layer, not a prerequisite for listing | https://www.okadoc.com/en-sa/pro |
| Practo | Doctor discovery plus broader clinic/provider software ecosystem | Keep patient discovery simple while offering a serious provider operations layer | https://www.practo.com/ |
| Docplanner / Doctoralia | Marketplace plus clinic management and reputation at scale | Strong review moderation, provider tooling and localization | https://www.docplanner.com/ |
| Healthgrades | Search by doctor, condition, procedure, specialty and location | Build healthcare-specific search beyond doctor-name lookup | https://www.healthgrades.com/ |
| OneDoc | Practitioner/institution search, reason-for-visit, in-person/remote availability, booking | Model appointment reasons and care modality explicitly | https://www.onedoc.ch/en/ |

## Secondary products to study

- Top Doctors — https://www.topdoctors.com/
- Healthengine — https://healthengine.com.au/
- HotDoc — https://www.hotdoc.com.au/
- Kry / Livi — https://www.kry.se/ and https://www.livi.co.uk/
- Doctena — https://www.doctena.com/
- Doctoranytime — https://www.doctoranytime.gr/
- Air Doctor — https://www.air-dr.com/

These should be reviewed for geography, travel-health use cases, telehealth, booking UX and provider acquisition patterns.

## What competitors validate

### Search matters before booking

Patients often start with a problem, procedure, insurance constraint or location—not a known doctor name.

### Availability is a ranking feature

A perfect provider who cannot see the patient for weeks may be less useful than another qualified provider with appropriate near-term availability.

### Reviews need trust mechanics

Open anonymous review systems are easier to manipulate. Closed-loop or encounter-linked reviews create a stronger trust signal.

### Integrations are a major B2B moat

Scheduling integrations reduce duplicate work and make availability more accurate. Zyara should define a clean adapter contract early.

### Provider profiles need structured depth

A profile should be queryable by specialty, services, languages, insurance, facility affiliation, modality, location and appointment reason—not just free-text biography.

## Where Zyara should differentiate

### 1. Map-native healthcare discovery

Most appointment marketplaces remain list/search-first. Zyara should make map and travel-time discovery a first-class healthcare experience.

### 2. AI-native navigation

The user should be able to explain their need naturally without knowing the correct medical department. AI converts intent into a safe care-navigation query over structured provider data.

### 3. Explainable ranking

Show reasons such as:

- accepts your insurance;
- 8 minutes away;
- Arabic speaking;
- next slot today;
- relevant subspecialty;
- verified visit score;
- prior continuity relationship.

### 4. Trust graph

A provider's public presence should combine regulatory verification, facility association, data freshness, encounter-linked reviews and provenance.

### 5. Provider demand intelligence

Zyara should tell a clinic not only what happened, but what unmet demand exists. Example:

> “Patients made 1,421 searches for pediatric dermatology within your catchment area this month; your branches currently expose no bookable pediatric dermatology service.”

### 6. Patient continuity

Booking should not end the relationship. The timeline, reminders, follow-ups and connected records should make Zyara useful between visits.

### 7. Revenue without patient booking fees

Free patient access reduces friction. Monetization should be based on provider software value, integrations, analytics and enterprise needs.

## Saudi launch references

- Saudi Commission for Health Specialties practitioner-registration verification: https://scfhs.org.sa/en/node/1992
- National Address APIs (search, geocode, POIs, maps): https://api.address.gov.sa/apidocumentation
- Saudi Ministry of Health e-health vision: https://www.moh.gov.sa/en/Ministry/nehs/Pages/The-Complete-Vision.aspx
- Saudi MOH interoperability direction (HL7/FHIR/DICOM): https://www.moh.gov.sa/Ministry/vro/eHealth/Documents/MoH-Digital-Health-Strategy-Update.pdf
- Saudi PDPL knowledge center: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/

## Brand competition warning

The word family `Zyara/Ziara/Ziyara` is already used in scheduling and health-related products. Treat brand clearance as a formal legal gate, not a later design task.
