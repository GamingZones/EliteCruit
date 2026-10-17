import React, { useEffect, useRef, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import "./ApplicantDocumentsModal.css";

interface DocumentItem {
  id: number | string;
  file_name: string;
  file_size?: number | null;
  mimetype?: string;
  created_at?: string | null;
  url: string;
  is_resume?: boolean;
}

interface ApplicantDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  onProfileUpdated?: () => void;
}

function formatBytes(bytes?: number | null, decimals = 1) {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIconType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext || "")) return "word";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return "image";
  return "generic";
}

export default function ApplicantDocumentsModal({
  isOpen,
  onClose,
  userId,
  onProfileUpdated,
}: ApplicantDocumentsModalProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/applicants/${userId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      setMessage(null);
      fetchDocuments();
    }
  }, [isOpen, userId]);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  const handleUploadFile = async (file: File) => {
    if (!userId || isUploading) return;

    if (file.size > 15 * 1024 * 1024) {
      showMsg("File size exceeds maximum limit of 15 MB.", "error");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);

      const res = await fetch(`/api/applicants/${userId}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to attach document.");

      showMsg(`"${file.name}" attached successfully!`, "success");
      await fetchDocuments();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Failed to attach document.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = (doc: DocumentItem) => {
    setDocToDelete(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!userId || !docToDelete) return;
    const doc = docToDelete;
    setIsDeletingDoc(true);

    try {
      const url = doc.id === "resume"
        ? `/api/applicants/${userId}/resume`
        : `/api/applicants/${userId}/documents/${doc.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete document.");

      setDocToDelete(null);
      showMsg(`"${doc.file_name}" removed successfully.`, "success");
      await fetchDocuments();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Failed to remove document.", "error");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-title-group">
            <div className="doc-modal-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </div>
            <div>
              <h3>Document Attachments</h3>
              <p>All files, resumes, and document attachments saved to your profile.</p>
            </div>
          </div>
          <button type="button" className="doc-modal-close-btn" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`doc-modal-alert ${message.type === "error" ? "alert-error" : "alert-success"}`}>
            <span>{message.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="doc-modal-body">
          {/* SINGLE UPLOAD ZONE */}
          <div
            className={`doc-dropzone ${isDragging ? "dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleUploadFile(file);
            }}
          >
            <div className="dropzone-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="dropzone-text">
              <strong>Click or drag & drop to attach a document</strong>
              <small>PDF, DOC, DOCX, PNG, JPG, WEBP up to 15 MB</small>
            </div>
            <button type="button" className="dropzone-btn" disabled={isUploading}>
              {isUploading ? "Uploading..." : "+ Add Attachment"}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadFile(file);
            }}
          />

          {/* ATTACHMENTS LIST */}
          <div className="doc-list-section">
            <div className="doc-list-heading">
              <strong>Attached Documents ({documents.length})</strong>
            </div>

            {documents.length > 0 ? (
              <div className="attachments-list">
                {documents.map((doc) => {
                  const iconType = getFileIconType(doc.file_name);
                  const formattedSize = formatBytes(doc.file_size);
                  const uploadDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : null;

                  return (
                    <div key={`${doc.id}-${doc.file_name}`} className="doc-item-row">
                      <div className="doc-file-info">
                        <div className={`doc-file-icon ${iconType}`}>
                          {iconType === "pdf" && (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          )}
                          {iconType === "word" && (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <path d="M9 13l2 4 2-4" />
                            </svg>
                          )}
                          {iconType === "image" && (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                          {iconType === "generic" && (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                        </div>

                        <div className="doc-file-meta">
                          <strong className="doc-file-name" title={doc.file_name}>{doc.file_name}</strong>
                          <span className="doc-file-subtext">
                            {[formattedSize, uploadDate ? `Uploaded ${uploadDate}` : "Attached to profile"].filter(Boolean).join(" • ")}
                          </span>
                        </div>
                      </div>

                      <div className="doc-item-actions">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="doc-action-btn view-btn"
                          title="View Document"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>View</span>
                        </a>

                        <a
                          href={`${doc.url}?download=1`}
                          className="doc-action-btn download-btn"
                          title="Download Document"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>Download</span>
                        </a>

                        <button
                          type="button"
                          className="doc-action-btn delete-btn"
                          onClick={() => handleDeleteDocument(doc)}
                          title="Delete Document"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-attachments-notice">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>No document attachments found. Use the upload area above to attach your files.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="doc-modal-footer">
          <button type="button" className="doc-modal-btn-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      {/* DOUBLE VERIFICATION: DELETE ATTACHMENT MODAL */}
      <ConfirmationModal
        isOpen={!!docToDelete}
        type="danger"
        title="Remove Document"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to remove <strong>"{docToDelete?.file_name}"</strong> from your profile attachments?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Employers will no longer be able to review this document with your applications.
            </p>
          </div>
        }
        cancelLabel="Keep Document"
        confirmLabel="Remove Document"
        isConfirming={isDeletingDoc}
        onCancel={() => setDocToDelete(null)}
        onConfirm={confirmDeleteDocument}
      />
    </div>
  );
}
