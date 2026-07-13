import { Button } from "./ui/button";
import { toast } from "sonner";
import { ClipboardPaste } from "lucide-react";
import { readClipboardFiles } from "../hooks/usePasteFiles";

/**
 * A small "Paste" button for upload areas — reads an image from the clipboard
 * and hands it to the same handler the file picker / Ctrl+V paste use.
 *
 * @param {(files: File[]) => void} onFiles - receives the pasted File objects
 */
export function PasteButton({ onFiles, className = "", label = "Paste" }) {
  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const files = await readClipboardFiles();
      if (files.length) {
        onFiles(files);
        toast.success(
          `Pasted ${files.length} item${files.length > 1 ? "s" : ""} from clipboard`,
        );
      } else {
        toast.error("No image found in your clipboard");
      }
    } catch {
      toast.error("Clipboard paste isn't available in this browser");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={`h-7 gap-1 text-xs ${className}`}
      data-testid="paste-from-clipboard"
    >
      <ClipboardPaste className="w-3 h-3" /> {label}
    </Button>
  );
}

export default PasteButton;
