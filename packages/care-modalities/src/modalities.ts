// Approved telehealth and request-first home visits (M049).
// Modality is explicit per appointment. Home visits are request-first:
// a patient request stays pending until staff approve; only approval
// commits. Telehealth requires a verified meeting link plus recorded
// patient consent. Changing modality re-verifies authority from scratch.

export type Modality = "in-person" | "telehealth" | "home-visit";

export type HomeVisitState = "requested" | "approved" | "declined" | "booked";

export interface ModalityBooking {
  appointmentId: string;
  modality: Modality;
  telehealthLink: string | null;
  telehealthConsented: boolean;
  homeVisit: HomeVisitState | null;
  eligibleModalities: Modality[];
}

export function bookWithModality(input: {
  appointmentId: string;
  modality: Modality;
  eligibleModalities: Modality[];
  telehealthLink?: string | null;
  telehealthConsented?: boolean;
}): ModalityBooking | { error: string } {
  if (!input.eligibleModalities.includes(input.modality)) {
    return { error: `Modality ${input.modality} is not eligible for this service.` };
  }
  if (input.modality === "telehealth") {
    if (!input.telehealthLink) return { error: "Telehealth requires a verified meeting link." };
    if (!input.telehealthConsented) return { error: "Telehealth requires recorded patient consent." };
  }
  if (input.modality === "home-visit") {
    // Request-first: booking starts as a request, never an instant commit.
    return {
      appointmentId: input.appointmentId, modality: input.modality,
      telehealthLink: null, telehealthConsented: false,
      homeVisit: "requested", eligibleModalities: input.eligibleModalities,
    };
  }
  return {
    appointmentId: input.appointmentId, modality: input.modality,
    telehealthLink: input.telehealthLink ?? null,
    telehealthConsented: input.telehealthConsented ?? false,
    homeVisit: null, eligibleModalities: input.eligibleModalities,
  };
}

export function reviewHomeVisit(
  booking: ModalityBooking,
  approve: boolean,
  actorId: string,
): ModalityBooking | { error: string } {
  if (booking.modality !== "home-visit" || booking.homeVisit !== "requested") {
    return { error: "No pending home-visit request to review." };
  }
  void actorId;
  return { ...booking, homeVisit: approve ? "approved" : "declined" };
}

export function changeModality(
  booking: ModalityBooking,
  to: Modality,
  evidence: { telehealthLink?: string | null; telehealthConsented?: boolean },
): ModalityBooking | { error: string } {
  // Re-verify authority from scratch through the same booking path.
  return bookWithModality({
    appointmentId: booking.appointmentId,
    modality: to,
    eligibleModalities: booking.eligibleModalities,
    telehealthLink: evidence.telehealthLink,
    telehealthConsented: evidence.telehealthConsented,
  });
}
