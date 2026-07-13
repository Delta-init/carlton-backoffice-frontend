import { useEffect, useRef } from "react";

/**
 * Adds clipboard paste (Cmd/Ctrl+V) as a second way to add files to an upload area.
 *
 * While `enabled` is true (typically the upload dialog's open state), any files or
 * images on the clipboard are collected and handed to `onFiles`. Pasting plain text
 * is ignored, so this never interferes with normal text pasting into inputs.
 *
 * @param {(files: File[]) => void} onFiles - receives the pasted File objects
 * @param {boolean} enabled - when true the paste listener is active
 */
/**
 * Read image files from the clipboard on demand — for an explicit "Paste" button.
 * Uses the async Clipboard API (requires a user gesture + secure context).
 * Returns [] if unavailable or the clipboard has no image.
 */
export async function readClipboardFiles() {
  if (!navigator.clipboard || !navigator.clipboard.read) return [];
  const items = await navigator.clipboard.read();
  const files = [];
  for (const item of items) {
    for (const type of item.types) {
      if (type.startsWith("image/")) {
        const blob = await item.getType(type);
        const ext = (type.split("/")[1] || "png").replace("jpeg", "jpg");
        files.push(new File([blob], `pasted-${Date.now()}.${ext}`, { type }));
      }
    }
  }
  return files;
}

export function usePasteFiles(onFiles, enabled = true) {
  const cb = useRef(onFiles);
  cb.current = onFiles;

  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      const files = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        cb.current(files);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [enabled]);
}

export default usePasteFiles;
