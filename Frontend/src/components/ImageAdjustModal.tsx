import React, { useEffect, useRef, useState } from "react";
import "./ImageAdjustModal.css";

interface ImageAdjustModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  title?: string;
  aspectRatio?: number; // e.g. 1 for square, 2.6 for cover
  outputWidth?: number;
  outputHeight?: number;
  isCircular?: boolean;
  onSave: (blob: Blob) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function ImageAdjustModal({
  isOpen,
  imageSrc,
  title = "Adjust Image",
  aspectRatio = 1,
  outputWidth = 600,
  outputHeight = 600,
  isCircular = false,
  onSave,
  onCancel,
  isSaving = false,
}: ImageAdjustModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPanX: number; initialPanY: number }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Compute viewport display size to match modal card width
  const maxViewportWidth = Math.min(520, typeof window !== "undefined" ? window.innerWidth - 72 : 520);
  let viewportWidth = maxViewportWidth;
  let viewportHeight = viewportWidth / aspectRatio;

  if (viewportHeight > 320) {
    viewportHeight = 320;
    viewportWidth = viewportHeight * aspectRatio;
  }

  // Reset adjustments whenever imageSrc changes or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);

      const img = new Image();
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Base scale so that image at zoom = 1 fills the viewport
  const baseScale = Math.max(
    naturalSize.width ? viewportWidth / naturalSize.width : 1,
    naturalSize.height ? viewportHeight / naturalSize.height : 1
  );

  const currentScale = baseScale * zoom;

  // Handle Drag / Pan Events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStartRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.startX;
    const dy = touch.clientY - dragStartRef.current.startY;
    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(3, Math.max(0.6, Number((prev + zoomStep).toFixed(2)))));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to default
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Render to canvas and export blob
  const handleApply = () => {
    if (!imageSrc || !imgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill white background for transparent images
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Scale ratio from display viewport to output canvas
    const R = outputWidth / viewportWidth;

    ctx.save();
    ctx.translate(outputWidth / 2 + pan.x * R, outputHeight / 2 + pan.y * R);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale * R, currentScale * R);
    ctx.drawImage(imgRef.current, -naturalSize.width / 2, -naturalSize.height / 2);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="adjust-modal-overlay" onClick={onCancel}>
      <div className="adjust-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="adjust-modal-header">
          <div>
            <h3>{title}</h3>
            <p>Drag to reposition, adjust zoom or rotate to fit</p>
          </div>
          <button type="button" className="adjust-close-btn" onClick={onCancel} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Viewport Stage */}
        <div className="adjust-viewport-stage">
          <div
            ref={viewportRef}
            className={`adjust-viewport ${isDragging ? "dragging" : ""} ${isCircular ? "circular-guide" : ""}`}
            style={{ width: viewportWidth, height: viewportHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {imageLoaded && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Adjusting"
                className="adjust-source-img"
                style={{
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${currentScale})`,
                }}
                draggable={false}
              />
            )}

            {/* Rule of thirds grid overlay */}
            <div className="adjust-grid-lines">
              <div className="adjust-line-v1" />
              <div className="adjust-line-v2" />
              <div className="adjust-line-h1" />
              <div className="adjust-line-h2" />
            </div>

            {/* Circular outline preview if requested */}
            {isCircular && <div className="adjust-circle-mask" />}
          </div>
          <span className="adjust-drag-hint">Click & drag to reposition</span>
        </div>

        {/* Unified Bottom Controls Bar */}
        <div className="adjust-modal-footer-bar">
          <div className="adjust-zoom-controls">
            <span className="control-label">Zoom</span>
            <button
              type="button"
              className="adjust-step-btn"
              onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
              title="Zoom out"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <input
              type="range"
              min="0.6"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="adjust-zoom-slider"
            />
            <button
              type="button"
              className="adjust-step-btn"
              onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
              title="Zoom in"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span className="zoom-percentage">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="adjust-footer-actions">
            <button type="button" className="adjust-cancel-btn" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="button" className="adjust-apply-btn" onClick={handleApply} disabled={isSaving}>
              {isSaving ? "Saving..." : "Apply & Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
