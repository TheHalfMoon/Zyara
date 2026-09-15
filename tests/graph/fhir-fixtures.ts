// Synthetic FHIR R4 fixtures (M006). No real provider data.
export const fhirOrganization = {
  resourceType: "Organization",
  id: "org-olaya",
  name: "Olaya Synthetic Clinic",
  partOf: undefined as unknown as undefined,
};

export const fhirLocation = {
  resourceType: "Location",
  id: "loc-olaya-1",
  name: "Olaya Branch 1",
  managingOrganization: { reference: "Organization/org-olaya" },
};

export const fhirPractitioner = {
  resourceType: "Practitioner",
  id: "pract-laila",
  name: [{ text: "ليلى Marie Müller" }],
};

export const fhirPractitionerRole = {
  resourceType: "PractitionerRole",
  id: "role-laila-olaya1",
  practitioner: { reference: "Practitioner/pract-laila" },
  organization: { reference: "Organization/org-olaya" },
  location: [{ reference: "Location/loc-olaya-1" }],
  specialty: [{ text: "Dermatology" }],
};

export const fhirHealthcareService = {
  resourceType: "HealthcareService",
  id: "svc-derm-consult",
  name: "Dermatology consultation",
  providedBy: { reference: "Organization/org-olaya" },
  location: [{ reference: "Location/loc-olaya-1" }],
};
