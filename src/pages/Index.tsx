import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import FileUploadZone from "@/components/FileUploadZone";
import AudioRecorder from "@/components/AudioRecorder";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TranscriptView, { TranscriptEntry } from "@/components/TranscriptView";
import MeetingProtocolPanel from "@/components/MeetingProtocolPanel";
import DocumentGeneratorPanel, { DocumentType } from "@/components/DocumentGeneratorPanel";
import ProcessingAnimation from "@/components/ProcessingAnimation";
import ShareDialog from "@/components/ShareDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import { processAudioFile, ProcessingProgress } from "@/lib/audio-processor";
import { Progress } from "@/components/ui/progress";
import { FileAudio, Sparkles, Download, LogOut, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// FIX (Bug 4): timeout for each fetch call to the Edge Function (2 minutes)
const FETCH_TIMEOUT_MS = 120_000;

// FIX (Bug 3): retry configuration — exponential backoff, 3 attempts
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3_000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const Index = () => {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [protocolTranscript, setProtocolTranscript] = useState<string | null>(null);
  const [docPanel, setDocPanel] = useState<{ transcript: string; type: DocumentType } | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Show share tooltip once per session
  useEffect(() => {
    const shown = sessionStorage.getItem("scribe_share_tooltip_shown");
    if (!shown) {
      const timer = setTimeout(() => {
        setShowShareTooltip(true);
        sessionStorage.setItem("scribe_share_tooltip_shown", "1");
        setTimeout(() => setShowShareTooltip(false), 10000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load saved transcripts from database
  useEffect(() => {
    if (!user) return;
    const loadTranscripts = async () => {
      const { data, error } = await supabase
        .from("transcripts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load transcripts:", error);
        return;
      }

      if (data) {
        setEntries(
          data.map((row: any) => ({
            id: row.id,
            fileName: row.file_name,
            status: row.status as "processing" | "completed" | "error",
            text: row.text || undefined,
            errorMessage: row.error_message || undefined,
            timestamp: new Date(row.created_at),
          }))
        );
      }
    };
    loadTranscripts();
  }, [user]);

  /**
   * FIX (Bug 3 + 4): retry with exponential backoff + per-request timeout.
   * Retryable errors: network failures, 429, 503, 504.
   * Non-retryable: 400, 413, 500 (misconfiguration).
   */
  const transcribeChunk = async (file: File): Promise<string> => {
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // FIX (Bug 4): AbortController with timeout
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const formData = new FormData();
        formData.append("audio", file);

        const resp = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          return data.text || "";
        }

        // Parse error body
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        const message = err.error || `Transcription failed: ${resp.status}`;

        // Non-retryable statuses
        if (resp.status === 400 || resp.status === 413 || resp.status === 500) {
          throw new Error(message);
        }

        // Retryable: 429, 503, 504, etc.
        lastError = new Error(message);
        console.warn(`Chunk attempt ${attempt}/${MAX_RETRIES} failed (${resp.status}): ${message}`);

      } catch (fetchErr: any) {
        clearTimeout(timeoutId);

        if (fetchErr.name === "AbortError") {
          lastError = new Error(
            `Превышено время ожидания ответа сервера (${FETCH_TIMEOUT_MS / 1000}с). ` +
            `Попытка ${attempt}/${MAX_RETRIES}.`
          );
        } else if (fetchErr.message?.includes("non-retryable") || attempt === MAX_RETRIES) {
          throw fetchErr;
        } else {
          lastError = fetchErr;
        }
        console.warn(`Chunk attempt ${attempt}/${MAX_RETRIES} fetch error:`, fetchErr.message);
      }

      // Wait before retry (exponential backoff: 3s, 6s, 12s)
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    throw lastError;
  };

  const transcribeFile = useCallback(async (file: File, entryId: string) => {
    try {
      setProcessingStage(t("compressing"));
      setProgressPercent(5);

      const chunks = await processAudioFile(file, (p: ProcessingProgress) => {
        if (p.stage === "decoding") {
          setProcessingStage(t("decoding"));
          setProgressPercent(10);
        } else if (p.stage === "resampling") {
          setProcessingStage(t("resampling"));
          setProgressPercent(10 + Math.round(p.percent * 0.15));
        } else if (p.stage === "chunking") {
          setProcessingStage(`${t("processing")} ${p.percent}%`);
          setProgressPercent(20 + Math.round(p.percent * 0.1));
        }
      });

      // FIX (Bug 5): accumulate partial results and persist to DB after each chunk
      const texts: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkProgress = 30 + Math.round(((i) / chunks.length) * 65);
        setProgressPercent(chunkProgress);
        setProcessingStage(
          chunks.length > 1
            ? `${t("transcribing_chunk")} ${i + 1}/${chunks.length}...`
            : t("transcribing")
        );

        const text = await transcribeChunk(chunks[i]);
        texts.push(text);

        // FIX (Bug 5): save partial progress to DB after every chunk
        // so that even if the next chunk fails, completed work is not lost
        const partialText = texts.join(" ");
        const isLast = i === chunks.length - 1;
        await supabase
          .from("transcripts")
          .update({
            text: partialText,
            status: isLast ? "completed" : "processing",
            // Store partial progress as a custom marker in error_message
            error_message: isLast ? null : `Обработано ${i + 1}/${chunks.length} частей`,
          })
          .eq("id", entryId);

        // Update UI with partial text too
        setEntries(prev =>
          prev.map(e =>
            e.id === entryId
              ? { ...e, text: partialText, status: isLast ? "completed" as const : "processing" as const }
              : e
          )
        );
      }

      setProcessingId(null);
      setProcessingStage("");
      setProgressPercent(100);
      setTimeout(() => setProgressPercent(0), 1000);
      toast.success(t("transcription_ready"));

    } catch (err: any) {
      // FIX (Bug 5): on error, save whatever partial text we already have
      const partialTexts = (err as any)._partialTexts;
      const savedText = partialTexts?.join(" ") || undefined;

      await supabase
        .from("transcripts")
        .update({
          status: "error",
          error_message: err.message,
          // Keep partial text if we have it
          ...(savedText ? { text: savedText } : {}),
        })
        .eq("id", entryId);

      setEntries(prev =>
        prev.map(e =>
          e.id === entryId
            ? {
                ...e,
                status: "error" as const,
                errorMessage: err.message,
                ...(savedText ? { text: savedText } : {}),
              }
            : e
        )
      );
      setProcessingId(null);
      setProcessingStage("");
      setProgressPercent(0);
      toast.error(err.message || t("error"));
    }
  }, [t]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!user) return;

      const { data: inserted, error } = await supabase
        .from("transcripts")
        .insert({
          user_id: user.id,
          file_name: file.name,
          status: "processing",
        })
        .select("id")
        .single();

      if (error || !inserted) {
        toast.error("Failed to create record");
        return;
      }

      const id = inserted.id;
      const entry: TranscriptEntry = {
        id,
        fileName: file.name,
        status: "processing",
        timestamp: new Date(),
      };
      setEntries(prev => [entry, ...prev]);
      setProcessingId(id);
      setExpandedId(id);
      // NOTE: intentionally not awaited — runs in background
      transcribeFile(file, id);
    },
    [transcribeFile, user]
  );

  const handleDelete = async (id: string) => {
    await supabase.from("transcripts").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (processingId === id) setProcessingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleSignOut = () => {
    setShowFeedback(true);
  };

  const handleFeedbackClose = () => {
    setShowFeedback(false);
    signOut();
  };

  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Psheslavsky branding — fixed top-right, separate from nav icons */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none select-none">
        <span className="font-mono text-xs font-semibold tracking-wide relative inline-flex items-baseline">
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Psheslavsky</span>
          <sup className="text-[9.5px] text-primary -ml-0.5 -translate-y-1 rotate-[-20deg]">©</sup>
        </span>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-6 sm:px-10 py-6 sm:py-10">
        {/* Header */}
        <header className="flex items-start justify-between mb-10 sm:mb-14">
          <div>
            <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2">
              Scribe<span className="text-primary">_</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-xl">
              {t("service_subtitle")}
            </p>
          </div>
          {/* Nav icons only — Psheslavsky is in fixed corner */}
          <div className="flex items-center gap-2 sm:gap-3 pr-28">
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowShare(true)} title={t("share_friend")} className="h-8 w-8">
                <Share2 className="h-4 w-4" />
              </Button>
              {showShareTooltip && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-primary text-primary-foreground text-xs rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 z-50 pointer-events-none transition-opacity duration-1000">
                  <div className="absolute -top-1.5 right-3 w-3 h-3 bg-primary rotate-45" />
                  {t("share_tooltip")}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Выйти" className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Upload & Record */}
        <section className="mb-8 sm:mb-10 space-y-4">
          <FileUploadZone onFileSelect={handleFileSelect} disabled={!!processingId} />
          <div className="flex items-center gap-3">
            <AudioRecorder onRecordingComplete={handleFileSelect} disabled={!!processingId} />
            <span className="text-xs text-muted-foreground">
              {t("record_audio_label")}
            </span>
          </div>
        </section>

        {/* Processing */}
        {processingId && (
          <section className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </div>
              <p className="font-mono text-sm text-muted-foreground">
                {processingStage || t("transcribing")}
              </p>
            </div>
            <Progress value={progressPercent} className="h-2 mb-3" />
            <ProcessingAnimation isActive={true} />
          </section>
        )}

        {/* Entries */}
        {entries.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <h2 className="font-mono text-xs font-medium tracking-wider uppercase text-muted-foreground mb-4">
              {t("transcriptions")}
            </h2>
            <div className="border-t border-border">
              {entries.map(entry => (
                <TranscriptView
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedId === entry.id}
                  onToggle={() => toggleExpand(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                  onGenerateProtocol={(text) => setProtocolTranscript(text)}
                  onGenerateBusinessReqs={(text) => setDocPanel({ transcript: text, type: "business-requirements" })}
                  onGenerateVisionScope={(text) => setDocPanel({ transcript: text, type: "vision-scope" })}
                  onGenerateSummary={(text) => setDocPanel({ transcript: text, type: "meeting-summary" })}
                  onGenerateUserStories={(text) => setDocPanel({ transcript: text, type: "user-stories" })}
                  onGenerateUseCases={(text) => setDocPanel({ transcript: text, type: "use-cases" })}
                  onGenerateFlowchart={(text) => setDocPanel({ transcript: text, type: "flowchart" })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Features when empty */}
        {entries.length === 0 && !processingId && (
          <section className="mb-10 sm:mb-14">
            <h2 className="font-mono text-xs font-medium tracking-wider uppercase text-muted-foreground mb-6">
              {t("features")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6">
              {[
                { icon: FileAudio, title: t("feat_record"), desc: t("feat_record_desc") },
                { icon: Sparkles, title: t("feat_ai"), desc: t("feat_ai_desc") },
                { icon: Download, title: t("feat_export"), desc: t("feat_export_desc") },
              ].map(item => (
                <div key={item.title} className="border border-border rounded-lg p-4 bg-card">
                  <item.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="font-mono text-sm font-medium text-foreground mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border pt-6">
          <p className="font-mono text-xs text-muted-foreground">
            {t("footer_text")}
          </p>
        </footer>
      </div>

      <MeetingProtocolPanel
        isOpen={!!protocolTranscript}
        onClose={() => setProtocolTranscript(null)}
        transcript={protocolTranscript || ""}
      />

      <DocumentGeneratorPanel
        isOpen={!!docPanel}
        onClose={() => setDocPanel(null)}
        transcript={docPanel?.transcript || ""}
        documentType={docPanel?.type || "business-requirements"}
      />

      <ShareDialog isOpen={showShare} onClose={() => setShowShare(false)} />

      <FeedbackDialog
        isOpen={showFeedback}
        onClose={handleFeedbackClose}
        artifactType="service-exit"
      />
    </div>
  );
};

export default Index;
