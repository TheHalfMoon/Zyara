import { Modal } from "./Modal.js";

// Explicit confirmation dialog (M005): high-impact actions require Confirm;
// Cancel is the default focus. Consent checkboxes must never be preselected:
// callers pass checked state explicitly (default false).
export function Confirm({
  titleId,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  titleId: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal labelledBy={titleId} onClose={onCancel}>
      <h2 id={titleId}>{title}</h2>
      <button type="button" autoFocus onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="button" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </Modal>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert">
      {message}
    </p>
  );
}
