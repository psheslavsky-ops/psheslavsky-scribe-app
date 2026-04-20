import { useCallback, useState, useRef } from "react";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/ogg",
  "audio/x-m4a", "audio/flac",
];

const FileUploadZone = ({ onFileSelect, disabled }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
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
        onChange={handleChange}
        className="hidden"
      />
      <p className="font-mono text-sm text-foreground mb-2">
        Перетащите файл сюда
      </p>
      <p className="font-body text-sm text-muted-foreground">
        или нажмите для выбора файла
      </p>
      <p className="font-body text-xs text-muted-foreground mt-4">
        MP3, WAV, M4A, FLAC, MP4, WebM, OGG · без ограничения размера
      </p>
    </div>
  );
};

export default FileUploadZone;
