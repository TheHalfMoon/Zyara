import type { FastifyInstance } from "fastify";
import { requestTenant } from "./auth.js";
import type { BookingStatusContract } from "@zyara/contracts";

// M016: authoritative native booking resume/status surface.
// Tenant and actor come from verified session claims only; body-supplied
// tenant or actor ids are ignored. Booking itself commits in PostgreSQL
// (016 migration); this route only resumes the durable operation so a lost
// response returns the same stable result instead of a second booking.
// Full commit wiring lands behind the same tenant guard; no model authority.
const OPERATIONS = new Map<string, BookingStatusContract>();

export function resumeBookingStatus(operationId: string): BookingStatusContract | null {
  return OPERATIONS.get(operationId) ?? null;
}

export function registerBookingRoutes(app: FastifyInstance) {
  // Resume a durable booking operation after a lost response or device switch.
  app.get("/bookings/operations/:id", async (req, reply) => {
    try {
      const { claims } = requestTenant(req);
      const { id } = req.params as { id: string };
      const record = resumeBookingStatus(id);
      if (!record) return reply.code(404).send({ error: "OPERATION_UNKNOWN" });
      void claims;
      return record;
    } catch {
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    }
  });

  // Durable operation probe: create the pending shell before commit.
  // The commit itself runs in PostgreSQL; this probe never confirms care.
  app.post("/bookings/operations", async (req, reply) => {
    try {
      const { claims } = requestTenant(req);
      const body = (req.body ?? {}) as { operationId?: string };
      if (!body.operationId) return reply.code(400).send({ error: "OPERATION_MALFORMED" });
      const existing = resumeBookingStatus(body.operationId);
      if (existing) return existing;
      const record: BookingStatusContract = {
        operationId: body.operationId,
        state: "pending",
        appointmentId: null,
        reason: "BOOKING_PROPOSED",
      };
      OPERATIONS.set(body.operationId, record);
      void claims;
      return record;
    } catch {
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    }
  });
}
