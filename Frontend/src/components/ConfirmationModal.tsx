import React from "react";
import "./ConfirmationModal.css";

export type ConfirmationModalType = "danger" | "warning" | "info" | "success";

export interface ConfirmationModalProps {
  isOpen: boolean;
  type?: ConfirmationModalType;
  title: string;
  message: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  icon?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmationModal({
  isOpen,
  type = "info",
  title,
  message,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  isConfirming = false,
  icon,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const renderIcon = () => {
    if (icon) return icon;
    if (type === "danger") {
      return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    }
    if (type === "warning") {
      return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }
    if (type === "success") {
      return (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    }
    // info (brand blue)
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  };

  return (
    <div className="system-popup-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className={`system-popup-icon-wrap ${type}`}>{renderIcon()}</div>
        <h3 className="system-popup-title">{title}</h3>
        <div className="system-popup-message">{message}</div>
        <div className="system-popup-actions">
          <button
            type="button"
            className="system-popup-btn secondary"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`system-popup-btn ${type === "danger" ? "danger" : ""}`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
