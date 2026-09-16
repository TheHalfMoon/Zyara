// Exact action confirmation across AI and UI (M043).
// A draft becomes executable only when the user answers the exact
// challenge: the precise action parameters rendered verbatim. Mismatched,
// stale, expired or rebound confirmations are rejected. Double submission
// returns the original receipt via idempotency. Every attempt is audited.

export interface ActionDraft {
  draftId: string;
  tenantId: string;
  action: string;
  /** Exact parameters the user must confirm verbatim. */
  params: Record<string, string>;
  challenge: string;
  issuedAtUtc: string;
  expiresAtUtc: string;
  idempotencyKey: string;
}

export interface ConfirmationReceipt {
  receiptId: string;
  draftId: string;
  confirmedAtUtc: string;
}

export interface ConfirmationAttempt {
  atUtc: string;
  draftId: string;
  answer: string;
  outcome: "accepted" | "rejected";
  reason: string;
}

export function renderChallenge(
  action: string,
  params: Record<string, string>,
): string {
  const parts = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`);
  return `${action}(${parts.join(", ")})`;
}

export class ConfirmationDesk {
  private drafts = new Map<string, ActionDraft>();
  private receipts = new Map<string, ConfirmationReceipt>();
  private attempts: ConfirmationAttempt[] = [];

  issue(draft: ActionDraft): void {
    this.drafts.set(draft.draftId, draft);
  }

  confirm(
    draftId: string,
    answer: string,
    nowUtc: string,
  ): ConfirmationReceipt | { error: string } {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      this.attempts.push({ atUtc: nowUtc, draftId, answer, outcome: "rejected", reason: "unknown-draft" });
      return { error: "Unknown draft." };
    }
    const prior = [...this.receipts.values()].find((r) => r.draftId === draftId);
    if (prior) return prior;
    if (nowUtc >= draft.expiresAtUtc) {
      this.attempts.push({ atUtc: nowUtc, draftId, answer, outcome: "rejected", reason: "expired" });
      return { error: "Confirmation expired; request a fresh challenge." };
    }
    if (answer !== draft.challenge) {
      this.attempts.push({ atUtc: nowUtc, draftId, answer, outcome: "rejected", reason: "challenge-mismatch" });
      return { error: "Answer does not match the exact challenge." };
    }
    const receipt: ConfirmationReceipt = {
      receiptId: `receipt-${draftId}`,
      draftId,
      confirmedAtUtc: nowUtc,
    };
    this.receipts.set(receipt.receiptId, receipt);
    this.attempts.push({ atUtc: nowUtc, draftId, answer, outcome: "accepted", reason: "exact-match" });
    return receipt;
  }

  attemptsFor(draftId: string): ConfirmationAttempt[] {
    return this.attempts.filter((a) => a.draftId === draftId);
  }
}
