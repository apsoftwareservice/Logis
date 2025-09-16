"use client"

import React, {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
} from "react";

type DropZoneProps = {
  onFilesDropped?: (files: File[]) => void;
  prompt?: string;
};

const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped, prompt }) => {
  const [visible, setVisible] = useState(false);
  const dragCounter = useRef(0);

  // Helpers
  const isFileDrag = (e: DragEvent | ReactDragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files");

  const show = () => setVisible(true);
  const hide = () => {
    dragCounter.current = 0;
    setVisible(false);
  };

  // Global listeners so the overlay appears even before hovering the box
  useEffect(() => {
    const onWindowDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      dragCounter.current += 1;
      show();
      e.preventDefault();
    };

    const onWindowDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const onWindowDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) hide();
    };

    const onWindowDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      hide();
      onFilesDropped?.(files);
    };

    window.addEventListener("dragenter", onWindowDragEnter);
    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("dragleave", onWindowDragLeave);
    window.addEventListener("drop", onWindowDrop);

    return () => {
      window.removeEventListener("dragenter", onWindowDragEnter);
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("dragleave", onWindowDragLeave);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, [onFilesDropped]);

  // Overlay handlers (keep counter stable when moving inside the overlay)
  const onOverlayDragEnter = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    dragCounter.current += 1;
    e.preventDefault();
  };

  const onOverlayDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const onOverlayDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) hide();
  };

  const onOverlayDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []);
    hide();
    onFilesDropped?.(files);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Drop files"
      onDragEnter={onOverlayDragEnter}
      onDragOver={onOverlayDragOver}
      onDragLeave={onOverlayDragLeave}
      onDrop={onOverlayDrop}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          border: "2px dashed #999",
          background: "white",
          minWidth: 320,
          minHeight: 160,
          padding: 24,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {prompt ?? "Drop log file"}
      </div>
    </div>
  );
};

export default DropZone;