// Zyara Network W3: clinic operations task queue.
// Qdrat semantic donor reference: TheHalfMoon/Qdrat@e2d2889.
// No Qdrat/Horilla code is copied. Non-clinical ops work only:
// helpdesk, maintenance, operational follow-up. Conservative lifecycle
// open -> acknowledged -> resolved. Never clinical authority.
import type { CoverageId } from "./coverage.js";
import type { WorkforceProvenance } from "./workforce.js";
export type OpsTaskId = string;
export type OpsTaskKind = "helpdesk" | "maintenance" | "follow_up";
export type OpsTaskStatus = "open" | "acknowledged" | "resolved";
export interface OpsTask {
  id: OpsTaskId;
  tenantId: string;
  branchId: string;
  coverageExceptionId: CoverageId | null;
  kind: OpsTaskKind;
  title: string;
  detail: string;
  status: OpsTaskStatus;
  assigneeAccountId: string | null;
  provenance: WorkforceProvenance;
}
export type OpsTaskErrorCode =
  | "OPS_TASK_DUPLICATE_ID"
  | "OPS_TASK_CROSS_TENANT"
  | "OPS_TASK_MISSING_TITLE"
  | "OPS_TASK_INVALID_KIND"
  | "OPS_TASK_INVALID_STATUS"
  | "OPS_TASK_INVALID_TRANSITION"
  | "OPS_TASK_UNKNOWN_REFERENCE";
export class OpsTaskError extends Error {
  code: OpsTaskErrorCode;
  constructor(code: OpsTaskErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
export function transitionOpsTaskStatus(current: OpsTaskStatus, next: OpsTaskStatus): OpsTaskStatus {
  if (current === "open" && next === "acknowledged") return next;
  if (current === "acknowledged" && next === "resolved") return next;
  throw new OpsTaskError("OPS_TASK_INVALID_TRANSITION", `invalid transition: ${current} -> ${next}`);
}
export class OpsTaskStore {
  readonly tasks = new Map<OpsTaskId, OpsTask>();
  private fail(code: OpsTaskErrorCode, message: string): never {
    throw new OpsTaskError(code, message);
  }
  create(task: OpsTask, scopeTenant: string): void {
    if (task.tenantId !== scopeTenant) this.fail("OPS_TASK_CROSS_TENANT", "cross-tenant write");
    if (this.tasks.has(task.id)) this.fail("OPS_TASK_DUPLICATE_ID", `duplicate task id: ${task.id}`);
    if (task.kind !== "helpdesk" && task.kind !== "maintenance" && task.kind !== "follow_up") {
      this.fail("OPS_TASK_INVALID_KIND", `unsupported kind: ${task.kind}`);
    }
    if (task.title.trim().length === 0) this.fail("OPS_TASK_MISSING_TITLE", "task title is required");
    if (task.status !== "open") this.fail("OPS_TASK_INVALID_STATUS", "new tasks must start open");
    this.tasks.set(task.id, task);
  }
  acknowledge(id: OpsTaskId, scopeTenant: string): OpsTask {
    return this.step(id, scopeTenant, "acknowledged");
  }
  resolve(id: OpsTaskId, scopeTenant: string): OpsTask {
    return this.step(id, scopeTenant, "resolved");
  }
  private step(id: OpsTaskId, scopeTenant: string, next: OpsTaskStatus): OpsTask {
    const cur = this.tasks.get(id);
    if (!cur || cur.tenantId !== scopeTenant) this.fail("OPS_TASK_UNKNOWN_REFERENCE", `task ${id}`);
    const c = this.tasks.get(id) as OpsTask;
    const updated: OpsTask = { ...c, status: transitionOpsTaskStatus(c.status, next) };
    this.tasks.set(id, updated);
    return updated;
  }
  list(scopeTenant: string, branchId?: string): OpsTask[] {
    return [...this.tasks.values()].filter(
      (t) => t.tenantId === scopeTenant && (branchId === undefined || t.branchId === branchId),
    );
  }
}
