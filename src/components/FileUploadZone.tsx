import { useCallback, useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/ogg", "audio/x-m4a", "audio/flac",
];

const FileUploadZone = ({ onFileSelect, disabled }: FileUploadZoneProps) => {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        border-2 border-solid rounded p-16 text-center cursor-pointer transition-colors
        ${isDragging ? "border-primary bg-primary/5" : "border-primary/40 hover:border-primary"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
        className="hidden"
      />
      <p className="font-mono text-sm text-foreground mb-2">
        {t("drop_file_here")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("or_click_to_select")}
      </p>
      <p className="text-xs text-muted-foreground mt-4">
        {t("file_formats")}
      </p>
    </div>
  );
};

export default FileUploadZone;
