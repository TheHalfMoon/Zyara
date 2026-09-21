// Zyara Network W3: clinic helpdesk / internal task queue.
//
// Qdrat semantic donor reference:
// TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
// This file adapts domain ideas only; it does not copy Qdrat/Horilla code.
//
// Tasks are administrative coordination records. They never mint clinical,
// scheduling, insurance or financial authority, they never replace
// Practitioner/PractitionerRole, and they never write to the domains they
// point at. Automation may raise and comment on work; only a human actor may
// close it.

import type { WorkforceProvenance, WorkforceStore } from "./workforce.js";

export type OpsTaskId = string;

export type OpsTaskKind =
  | "facility_helpdesk"
  | "it_access"
  | "referral_follow_up"
  | "prior_auth_exception"
  | "refill_routing"
  | "result_review"
  | "automation_handoff";

export type OpsTaskStatus = "open" | "in_progress" | "blocked" | "resolved" | "cancelled";
export type OpsTaskPriority = "low" | "normal" | "high" | "urgent";
export type OpsTaskSubjectType =
  | "none"
  | "appointment"
  | "referral"
  | "result"
  | "prescription_request"
  | "facility";
export type OpsActorKind = "human" | "automation";
export type OpsTaskEventAction = "created" | "assigned" | "transitioned";

export interface OpsActor {
  kind: OpsActorKind;
  accountId: string;
}

export interface OpsTaskOrigin {
  kind: OpsActorKind;
  ref: string;
}

export interface OpsTask {
  id: OpsTaskId;
  tenantId: string;
  branchId: string;
  kind: OpsTaskKind;
  status: OpsTaskStatus;
  priority: OpsTaskPriority;
  title: string;
  detail: string;
  requesterAccountId: string;
  assigneeAccountId: string | null;
  assigneeStaffAssignmentId: string | null;
  subjectType: OpsTaskSubjectType;
  subjectRef: string | null;
  dueAt: string | null;
  origin: OpsTaskOrigin;
  resolutionNote: string | null;
  resolvedAt: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  provenance: WorkforceProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface OpsTaskComment {
  id: string;
  tenantId: string;
  taskId: OpsTaskId;
  author: OpsActor;
  body: string;
  createdAt: string;
}

export interface OpsTaskEvent {
  id: string;
  tenantId: string;
  taskId: OpsTaskId;
  action: OpsTaskEventAction;
  fromStatus: OpsTaskStatus | null;
  toStatus: OpsTaskStatus | null;
  actor: OpsActor;
  reason: string;
  occurredAt: string;
}

export interface OpsTaskInput {
  id: OpsTaskId;
  tenantId: string;
  branchId: string;
  kind: OpsTaskKind;
  title: string;
  requesterAccountId: string;
  origin: OpsTaskOrigin;
  provenance: WorkforceProvenance;
  createdAt: string;
  priority?: OpsTaskPriority;
  detail?: string;
  assigneeAccountId?: string | null;
  assigneeStaffAssignmentId?: string | null;
  subjectType?: OpsTaskSubjectType;
  subjectRef?: string | null;
  dueAt?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

export interface OpsAssignee {
  accountId: string;
  staffAssignmentId: string;
}

export interface OpsTaskFilter {
  branchId?: string;
  assigneeAccountId?: string;
  status?: OpsTaskStatus;
}

export type OpsTaskErrorCode =
  | "TASK_DUPLICATE_ID"
  | "TASK_CROSS_TENANT"
  | "TASK_UNKNOWN_REFERENCE"
  | "TASK_MALFORMED"
  | "TASK_MALFORMED_SUBJECT"
  | "TASK_INVALID_KIND"
  | "TASK_INVALID_STATUS"
  | "TASK_INVALID_PRIORITY"
  | "TASK_INVALID_ORIGIN"
  | "TASK_INVALID_TRANSITION"
  | "TASK_MISSING_RESOLUTION_NOTE"
  | "TASK_TERMINAL_IMMUTABLE"
  | "TASK_AUTOMATION_CANNOT_CLOSE"
  | "TASK_ASSIGNEE_NOT_ELIGIBLE"
  | "TASK_IDEMPOTENCY_CONFLICT";

export class OpsTaskError extends Error {
  code: OpsTaskErrorCode;

  constructor(code: OpsTaskErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const OPS_TASK_KINDS: readonly OpsTaskKind[] = [
  "facility_helpdesk",
  "it_access",
  "referral_follow_up",
  "prior_auth_exception",
  "refill_routing",
  "result_review",
  "automation_handoff",
];

export const OPS_TASK_STATUSES: readonly OpsTaskStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "resolved",
  "cancelled",
];

export const OPS_TASK_PRIORITIES: readonly OpsTaskPriority[] = ["low", "normal", "high", "urgent"];

export const OPS_TASK_SUBJECT_TYPES: readonly OpsTaskSubjectType[] = [
  "none",
  "appointment",
  "referral",
  "result",
  "prescription_request",
  "facility",
];

export const OPS_ACTOR_KINDS: readonly OpsActorKind[] = ["human", "automation"];

// Explicit lifecycle. Cancelled work is frozen; resolved work may only be
// reopened with a recorded reason, never silently edited.
export const OPS_TASK_TRANSITIONS: Record<OpsTaskStatus, readonly OpsTaskStatus[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["blocked", "resolved", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  resolved: ["open"],
  cancelled: [],
};

const TERMINAL_STATUSES: readonly OpsTaskStatus[] = ["resolved", "cancelled"];
const HUMAN_OWNED_STATUSES: readonly OpsTaskStatus[] = ["resolved", "cancelled"];

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
  return (allowed as readonly string[]).includes(value);
}

function requiredText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export class OpsTaskStore {
  readonly tasks = new Map<OpsTaskId, OpsTask>();
  readonly comments = new Map<string, OpsTaskComment>();
  readonly events = new Map<string, OpsTaskEvent>();

  private readonly idempotency = new Map<string, OpsTaskId>();
  private readonly fingerprints = new Map<OpsTaskId, string>();

  private fail(code: OpsTaskErrorCode, message: string): never {
    throw new OpsTaskError(code, message);
  }

  private checkTenant(recordTenant: string, scopeTenant: string): void {
    if (recordTenant !== scopeTenant) {
      this.fail("TASK_CROSS_TENANT", `cross-tenant task write: ${recordTenant} != ${scopeTenant}`);
    }
  }

  private fingerprint(input: OpsTaskInput): string {
    return JSON.stringify([
      input.branchId,
      input.kind,
      input.priority ?? "normal",
      input.title,
      input.detail ?? "",
      input.requesterAccountId,
      input.assigneeAccountId ?? null,
      input.assigneeStaffAssignmentId ?? null,
      input.subjectType ?? "none",
      input.subjectRef ?? null,
      input.dueAt ?? null,
      input.origin.kind,
      input.origin.ref,
      input.correlationId ?? null,
    ]);
  }

  private resolveAssignee(
    assignee: OpsAssignee,
    taskBranchId: string,
    scopeTenant: string,
    workforce: WorkforceStore,
    asOf: string,
  ): void {
    if (!requiredText(assignee.accountId) || !requiredText(assignee.staffAssignmentId)) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "assignee account and staff assignment are required");
    }
    const assignment = workforce.staffAssignments.get(assignee.staffAssignmentId);
    if (!assignment || assignment.tenantId !== scopeTenant) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "assignee has no staff assignment in this tenant");
    }
    if (assignment.accountId !== assignee.accountId) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "staff assignment belongs to another account");
    }
    if (assignment.branchId !== taskBranchId) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "staff assignment is not in the task branch");
    }
    const asOfDay = asOf.slice(0, 10);
    if (asOfDay < assignment.effectiveFrom) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "staff assignment is not effective yet");
    }
    if (assignment.effectiveTo !== null && asOfDay >= assignment.effectiveTo) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "staff assignment already ended");
    }
  }

  private recordEvent(event: OpsTaskEvent, scopeTenant: string): void {
    this.checkTenant(event.tenantId, scopeTenant);
    if (this.events.has(event.id)) this.fail("TASK_DUPLICATE_ID", `duplicate task event id: ${event.id}`);
    this.events.set(event.id, event);
  }

  // Event ids are generated server-side from a monotonic counter so that no
  // caller can collide with, reorder or overwrite the append-only trail.
  private nextEventId(): string {
    return `ops-task-event-${this.events.size + 1}`;
  }

  private taskFor(taskId: OpsTaskId, scopeTenant: string): OpsTask {
    const task = this.tasks.get(taskId);
    if (!task || task.tenantId !== scopeTenant) {
      this.fail("TASK_UNKNOWN_REFERENCE", `task ${taskId}`);
    }
    return task;
  }

  // Cancelled work is frozen outright. Resolved work is closed to assignment
  // and comments; it may only be reopened through transition, which records the
  // reason in the append-only event trail.
  private assertNotTerminal(task: OpsTask): void {
    if (TERMINAL_STATUSES.includes(task.status)) {
      this.fail("TASK_TERMINAL_IMMUTABLE", `task ${task.id} is ${task.status}`);
    }
  }

  private assertNotCancelled(task: OpsTask): void {
    if (task.status === "cancelled") {
      this.fail("TASK_TERMINAL_IMMUTABLE", `task ${task.id} is cancelled`);
    }
  }

  createTask(input: OpsTaskInput, scopeTenant: string, workforce?: WorkforceStore): OpsTask {
    this.checkTenant(input.tenantId, scopeTenant);
    if (!requiredText(input.id) || !requiredText(input.branchId) || !requiredText(input.title)) {
      this.fail("TASK_MALFORMED", "id, branchId and title are required");
    }
    if (!requiredText(input.requesterAccountId)) {
      this.fail("TASK_MALFORMED", "requesterAccountId is required");
    }
    if (!isOneOf(OPS_TASK_KINDS, input.kind)) {
      this.fail("TASK_INVALID_KIND", `unsupported task kind: ${input.kind}`);
    }
    const priority = input.priority ?? "normal";
    if (!isOneOf(OPS_TASK_PRIORITIES, priority)) {
      this.fail("TASK_INVALID_PRIORITY", `unsupported task priority: ${priority}`);
    }
    if (!isOneOf(OPS_ACTOR_KINDS, input.origin.kind) || !requiredText(input.origin.ref)) {
      this.fail("TASK_INVALID_ORIGIN", "task origin must name a human or automation actor");
    }
    const subjectType = input.subjectType ?? "none";
    if (!isOneOf(OPS_TASK_SUBJECT_TYPES, subjectType)) {
      this.fail("TASK_MALFORMED_SUBJECT", `unsupported task subject type: ${subjectType}`);
    }
    const subjectRef = input.subjectRef ?? null;
    if ((subjectType === "none") !== (subjectRef === null)) {
      this.fail("TASK_MALFORMED_SUBJECT", "subjectRef is required exactly when subjectType is set");
    }
    const assigneeAccountId = input.assigneeAccountId ?? null;
    const assigneeStaffAssignmentId = input.assigneeStaffAssignmentId ?? null;
    if ((assigneeAccountId === null) !== (assigneeStaffAssignmentId === null)) {
      this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "assigneeAccountId and assigneeStaffAssignmentId must be set together");
    }
    const idempotencyKey = input.idempotencyKey ?? null;
    const fingerprint = this.fingerprint(input);
    if (idempotencyKey !== null) {
      if (!requiredText(idempotencyKey)) this.fail("TASK_MALFORMED", "idempotencyKey must not be blank");
      const existingId = this.idempotency.get(`${scopeTenant}:${idempotencyKey}`);
      if (existingId !== undefined) {
        if (this.fingerprints.get(existingId) !== fingerprint) {
          this.fail("TASK_IDEMPOTENCY_CONFLICT", `idempotency key reused with different content: ${idempotencyKey}`);
        }
        return this.tasks.get(existingId) as OpsTask;
      }
    }
    // Assignee eligibility is evaluated only for a genuinely new task. A replay
    // of an accepted request must stay safe even when the assignment has since
    // expired, otherwise a retry after a timeout would fail or duplicate work.
    if (assigneeStaffAssignmentId !== null && assigneeAccountId !== null) {
      if (!workforce) {
        this.fail("TASK_ASSIGNEE_NOT_ELIGIBLE", "assignee resolution requires the workforce graph");
      }
      this.resolveAssignee(
        { accountId: assigneeAccountId, staffAssignmentId: assigneeStaffAssignmentId },
        input.branchId,
        scopeTenant,
        workforce,
        input.createdAt,
      );
    }
    if (this.tasks.has(input.id)) {
      this.fail("TASK_DUPLICATE_ID", `duplicate task id: ${input.id}`);
    }
    const task: OpsTask = {
      id: input.id,
      tenantId: input.tenantId,
      branchId: input.branchId,
      kind: input.kind,
      status: "open",
      priority,
      title: input.title,
      detail: input.detail ?? "",
      requesterAccountId: input.requesterAccountId,
      assigneeAccountId,
      assigneeStaffAssignmentId,
      subjectType,
      subjectRef,
      dueAt: input.dueAt ?? null,
      origin: { kind: input.origin.kind, ref: input.origin.ref },
      resolutionNote: null,
      resolvedAt: null,
      correlationId: input.correlationId ?? null,
      idempotencyKey,
      provenance: input.provenance,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.tasks.set(task.id, task);
    this.fingerprints.set(task.id, fingerprint);
    if (idempotencyKey !== null) this.idempotency.set(`${scopeTenant}:${idempotencyKey}`, task.id);
    this.recordEvent(
      {
        id: `${task.id}:created`,
        tenantId: scopeTenant,
        taskId: task.id,
        action: "created",
        fromStatus: null,
        toStatus: "open",
        actor: { kind: input.origin.kind, accountId: input.requesterAccountId },
        reason: "",
        occurredAt: input.createdAt,
      },
      scopeTenant,
    );
    return task;
  }

  assign(
    taskId: OpsTaskId,
    assignee: OpsAssignee,
    scopeTenant: string,
    workforce: WorkforceStore,
    actor: OpsActor,
    at: string,
  ): OpsTask {
    const task = this.taskFor(taskId, scopeTenant);
    this.assertNotTerminal(task);
    if (!isOneOf(OPS_ACTOR_KINDS, actor.kind)) {
      this.fail("TASK_INVALID_ORIGIN", "task actor must be human or automation");
    }
    this.resolveAssignee(assignee, task.branchId, scopeTenant, workforce, at);
    const updated: OpsTask = {
      ...task,
      assigneeAccountId: assignee.accountId,
      assigneeStaffAssignmentId: assignee.staffAssignmentId,
      updatedAt: at,
    };
    this.tasks.set(taskId, updated);
    this.recordEvent(
      {
        id: this.nextEventId(),
        tenantId: scopeTenant,
        taskId,
        action: "assigned",
        fromStatus: task.status,
        toStatus: task.status,
        actor,
        reason: `assigned to ${assignee.accountId}`,
        occurredAt: at,
      },
      scopeTenant,
    );
    return updated;
  }

  transition(
    taskId: OpsTaskId,
    next: OpsTaskStatus,
    actor: OpsActor,
    scopeTenant: string,
    options: { at: string; reason?: string; resolutionNote?: string | null },
  ): OpsTask {
    const task = this.taskFor(taskId, scopeTenant);
    this.assertNotCancelled(task);
    if (!isOneOf(OPS_TASK_STATUSES, next)) {
      this.fail("TASK_INVALID_STATUS", `unsupported task status: ${next}`);
    }
    if (!isOneOf(OPS_ACTOR_KINDS, actor.kind) || !requiredText(actor.accountId)) {
      this.fail("TASK_INVALID_ORIGIN", "task actor must name a human or automation account");
    }
    if (actor.kind === "automation" && HUMAN_OWNED_STATUSES.includes(next)) {
      this.fail("TASK_AUTOMATION_CANNOT_CLOSE", "automation cannot resolve or cancel human-owned work");
    }
    if (!OPS_TASK_TRANSITIONS[task.status].includes(next)) {
      this.fail("TASK_INVALID_TRANSITION", `invalid transition: ${task.status} -> ${next}`);
    }
    const reason = options.reason ?? "";
    let resolutionNote: string | null = null;
    if (next === "resolved") {
      if (!requiredText(options.resolutionNote ?? null)) {
        this.fail("TASK_MISSING_RESOLUTION_NOTE", "resolving a task requires recorded outcome evidence");
      }
      resolutionNote = (options.resolutionNote as string).trim();
    }
    if (task.status === "resolved" && next === "open" && !requiredText(reason)) {
      this.fail("TASK_INVALID_TRANSITION", "reopening a resolved task requires a recorded reason");
    }
    const updated: OpsTask = {
      ...task,
      status: next,
      resolutionNote,
      resolvedAt: next === "resolved" ? options.at : null,
      updatedAt: options.at,
    };
    this.tasks.set(taskId, updated);
    this.recordEvent(
      {
        id: this.nextEventId(),
        tenantId: scopeTenant,
        taskId,
        action: "transitioned",
        fromStatus: task.status,
        toStatus: next,
        actor,
        reason,
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  addComment(comment: OpsTaskComment, scopeTenant: string): OpsTask {
    const task = this.taskFor(comment.taskId, scopeTenant);
    this.checkTenant(comment.tenantId, scopeTenant);
    this.assertNotTerminal(task);
    if (this.comments.has(comment.id)) {
      this.fail("TASK_DUPLICATE_ID", `duplicate task comment id: ${comment.id}`);
    }
    if (!isOneOf(OPS_ACTOR_KINDS, comment.author.kind) || !requiredText(comment.author.accountId)) {
      this.fail("TASK_INVALID_ORIGIN", "comment author must name a human or automation account");
    }
    if (!requiredText(comment.body)) {
      this.fail("TASK_MALFORMED", "comment body must not be blank");
    }
    this.comments.set(comment.id, comment);
    const updated: OpsTask = { ...task, updatedAt: comment.createdAt };
    this.tasks.set(task.id, updated);
    return updated;
  }

  listTasks(scopeTenant: string, filter: OpsTaskFilter = {}): OpsTask[] {
    return [...this.tasks.values()].filter(
      (task) =>
        task.tenantId === scopeTenant &&
        (filter.branchId === undefined || task.branchId === filter.branchId) &&
        (filter.assigneeAccountId === undefined || task.assigneeAccountId === filter.assigneeAccountId) &&
        (filter.status === undefined || task.status === filter.status),
    );
  }

  listComments(taskId: OpsTaskId, scopeTenant: string): OpsTaskComment[] {
    this.taskFor(taskId, scopeTenant);
    return [...this.comments.values()].filter(
      (comment) => comment.taskId === taskId && comment.tenantId === scopeTenant,
    );
  }

  listEvents(taskId: OpsTaskId, scopeTenant: string): OpsTaskEvent[] {
    this.taskFor(taskId, scopeTenant);
    return [...this.events.values()].filter(
      (event) => event.taskId === taskId && event.tenantId === scopeTenant,
    );
  }
}
