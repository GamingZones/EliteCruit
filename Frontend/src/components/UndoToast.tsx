import React, { useEffect, useState } from "react";
import "./UndoToast.css";

export interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onClose: () => void;
  duration?: number;
}

export default function UndoToast({
  message,
  onUndo,
  onClose,
  duration = 5000,
}: UndoToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(onClose, 250);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleUndoClick = () => {
    onUndo();
    onClose();
  };

  return (
    <div className={`undo-toast-container ${isClosing ? "closing" : ""}`}>
      <span className="undo-toast-message">{message}</span>
      <button type="button" className="undo-toast-btn" onClick={handleUndoClick}>
        Undo
      </button>
      <button
        type="button"
        className="undo-toast-close"
        onClick={() => {
          setIsClosing(true);
          setTimeout(onClose, 250);
        }}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
