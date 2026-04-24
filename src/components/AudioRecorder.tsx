import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

// Soft warning at 45 min, hard stop at 3 hours
const WARN_SECONDS = 45 * 60;
const MAX_SECONDS  = 3 * 60 * 60;

const pickMimeType = (): string => {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return m;
    }
  }
  return "audio/webm";
};

const AudioRecorder = ({ onRecordingComplete, disabled }: AudioRecorderProps) => {
  const { t } = useI18n();
  const [isRecording, setIsRecording]   = useState(false);
  // FIX (Bug 6): new state for the assembly phase between stop and callback
  const [isAssembling, setIsAssembling] = useState(false);
  const [duration, setDuration]         = useState(0);
  const [sizeMb, setSizeMb]             = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const totalBytesRef    = useRef(0);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnedRef        = useRef(false);
  const mimeRef          = useRef<string>("audio/webm");
  const streamRef        = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    cleanup();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    cleanup();
    setIsRecording(false);
    // FIX (Bug 6): show assembling state immediately — onstop fires async
    setIsAssembling(true);
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // already stopped
      setIsAssembling(false);
    }
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeRef.current = mimeType;

      // 24 kbps ≈ 10 MB/hour — keeps large recordings manageable
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 24_000,
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current     = [];
      totalBytesRef.current = 0;
      warnedRef.current     = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          totalBytesRef.current += e.data.size;
          setSizeMb(totalBytesRef.current / (1024 * 1024));
        }
      };

      mediaRecorder.onerror = (ev: any) => {
        console.error("MediaRecorder error:", ev?.error || ev);
        toast.error("Ошибка записи. Попробуйте снова.");
        cleanup();
        setIsRecording(false);
        setIsAssembling(false);
        stream.getTracks().forEach(t => t.stop());
      };

      // FIX (Bug 6): onstop now clears isAssembling after blob is ready
      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeRef.current });
          // Free chunks immediately so GC can reclaim before heavy processing
          chunksRef.current = [];
          const ext  = mimeRef.current.includes("mp4") ? "m4a" : "webm";
          const file = new File([blob], `recording-${Date.now()}.${ext}`, {
            type: mimeRef.current,
          });
          onRecordingComplete(file);
        } catch (err) {
          console.error("Failed to assemble recording:", err);
          toast.error("Не удалось сохранить запись.");
        } finally {
          // FIX (Bug 6): always clear assembling state here, not in stopRecording
          setIsAssembling(false);
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      // Flush every 5s — keeps internal buffers small for long recordings
      mediaRecorder.start(5000);
      setIsRecording(true);
      setIsAssembling(false);
      setDuration(0);
      setSizeMb(0);

      timerRef.current = setInterval(() => {
        setDuration(d => {
          const next = d + 1;
          if (next === WARN_SECONDS && !warnedRef.current) {
            warnedRef.current = true;
            toast.warning(
              "Запись идёт уже 45 минут. Рекомендуем остановить и обработать, затем начать новую запись."
            );
          }
          if (next >= MAX_SECONDS) {
            toast.info("Достигнут максимум 3 часа — запись остановлена.");
            stopRecording();
          }
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Нет доступа к микрофону");
    }
  }, [onRecordingComplete, stopRecording, cleanup]);

  const formatTime = (s: number) => {
    const h  = Math.floor(s / 3600);
    const m  = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = sc.toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // FIX (Bug 6): show spinner during blob assembly
  if (isAssembling) {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">
          {t("assembling")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {isRecording ? (
        <>
          <Button variant="destructive" size="sm" onClick={stopRecording} className="gap-2">
            <Square className="h-3 w-3" />
            {t("stop_recording")}
          </Button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
            <span className="font-mono text-sm text-foreground">{formatTime(duration)}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {sizeMb.toFixed(1)} МБ
            </span>
          </div>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={startRecording}
          disabled={disabled}
          className="gap-2"
        >
          <Mic className="h-4 w-4" />
          {t("record_audio_btn")}
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;
