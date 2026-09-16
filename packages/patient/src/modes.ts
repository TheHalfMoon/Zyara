// M017 honest booking-mode semantics. English only.
// Instant mode claims booked only with authoritative M016 committed truth.
// Request mode is never an appointment and never reserves availability.
// Call mode directs the patient to call; redirect mode leaves Zyara.

export type BookingMode = "instant" | "request" | "call" | "redirect";
export type RequestStatus = "draft" | "submitted" | "pending" | "accepted" | "declined" | "expired";

export interface ModeSelection {
  mode: BookingMode;
  providerId: string;
  serviceId: string;
}

export interface InstantOutcomeInput {
  committed: boolean;
  appointmentId?: string;
  reference?: string;
}

export interface RequestOutcomeInput {
  status: RequestStatus;
  owner: string;
  responseDeadlineIso?: string;
  nextStep: string;
  hasReservation: boolean;
}

export interface CallOutcomeInput {
  phoneDisplay: string;
}

export interface RedirectOutcomeInput {
  externalAuthority: string;
  hasProof: boolean;
}

export interface HonestOutcome {
  headline: string;
  body: string;
  isBooked: boolean;
  isReservation: boolean;
}

export function instantOutcome(input: InstantOutcomeInput): HonestOutcome {
  if (input.committed && input.appointmentId) {
    return {
      headline: "Booked and confirmed",
      body: `Committed appointment ${input.appointmentId}. Show reference ${input.reference ?? input.appointmentId} on arrival.`,
      isBooked: true,
      isReservation: true,
    };
  }
  return {
    headline: "Not booked yet",
    body: "No committed booking exists. Complete confirmation and commit before treating this time as yours.",
    isBooked: false,
    isReservation: false,
  };
}

export function requestOutcome(input: RequestOutcomeInput): HonestOutcome {
  const deadline = input.responseDeadlineIso ?? "response time to be confirmed by the provider";
  const body =
    `Request status: ${input.status}. Owner: ${input.owner}. ` +
    `Expected response: ${deadline}. Next: ${input.nextStep}. ` +
    "This request is not an appointment and holds no availability.";
  return { headline: "Request pending, not an appointment", body, isBooked: false, isReservation: false };
}

export function callOutcome(input: CallOutcomeInput): HonestOutcome {
  return {
    headline: "Call the provider to book",
    body: `Zyara did not make an appointment. Call ${input.phoneDisplay} to book directly; the clinic owns the schedule.`,
    isBooked: false,
    isReservation: false,
  };
}

export function redirectOutcome(input: RedirectOutcomeInput): HonestOutcome {
  if (input.hasProof) {
    return {
      headline: "External booking submitted for verification",
      body: `You used ${input.externalAuthority}. A booking is confirmed only after Zyara verifies authoritative proof.`,
      isBooked: false,
      isReservation: false,
    };
  }
  return {
    headline: "You are leaving Zyara",
    body: `Continue on ${input.externalAuthority} to book. Returning here does not prove success; nothing is confirmed without authoritative proof.`,
    isBooked: false,
    isReservation: false,
  };
}
