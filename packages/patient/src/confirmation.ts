// M017 exact confirmation challenge. English only.
// Binds material facts; any material change requires renewed confirmation.

export interface ConfirmationFacts {
  patientId: string;
  actorId: string;
  actorRelation: "self" | "delegate";
  providerId: string;
  serviceId: string;
  location: string;
  startIso: string;
  timezone: string;
  mode: string;
  policyState: string;
  materialVersion: string;
  priceCaveat?: string;
}

export interface ConfirmationChallenge {
  facts: ConfirmationFacts;
  digest: string;
  consented: boolean;
}

export function digestFacts(facts: ConfirmationFacts): string {
  const raw = JSON.stringify(facts);
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return `m017-${hash.toString(16).padStart(8, "0")}`;
}

export function buildChallenge(facts: ConfirmationFacts): ConfirmationChallenge {
  return { facts: { ...facts }, digest: digestFacts(facts), consented: false };
}

export function acceptChallenge(challenge: ConfirmationChallenge): ConfirmationChallenge {
  return { ...challenge, consented: true };
}

export function challengeStillValid(challenge: ConfirmationChallenge, current: ConfirmationFacts): boolean {
  return challenge.consented && challenge.digest === digestFacts(current);
}
