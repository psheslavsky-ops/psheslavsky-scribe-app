import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Download, FileText, Copy, Loader2, ExternalLink } from "lucide-react";
import { exportToTxt, exportToDocx } from "@/lib/export";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface MeetingProtocolPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SCRIBE_FOOTER = '\n\n---\nСоздано в "Scribe". Попробуйте бесплатно';

const MeetingProtocolPanel = ({ isOpen, onClose, transcript }: MeetingProtocolPanelProps) => {
  const { t } = useI18n();
  const [protocol, setProtocol] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generateProtocol = useCallback(async () => {
    setIsLoading(true);
    setProtocol("");
    setIsComplete(false);
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/meeting-protocol`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ transcript }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Error generating protocol");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setProtocol(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      setIsComplete(true);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error("Error generating protocol");
      }
    } finally {
      setIsLoading(false);
    }
  }, [transcript]);

  useEffect(() => {
    if (isOpen && transcript) {
      generateProtocol();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [isOpen, transcript, generateProtocol]);

  if (!isOpen) return null;

  const canSave = isComplete && protocol.length > 0;
  const protocolWithFooter = protocol + SCRIBE_FOOTER;

  const handleSave = (format: "copy" | "txt" | "docx" | "gdocs") => {
    if (!canSave) {
      toast.info(t("wait_full_load"));
      return;
    }

    if (format === "copy") {
      navigator.clipboard.writeText(protocolWithFooter);
      toast.success(t("copied"));
    } else if (format === "txt") {
      exportToTxt(protocolWithFooter, "protocol");
      toast.success(t("saved_txt"));
    } else if (format === "docx") {
      exportToDocx(protocolWithFooter, "protocol");
      toast.success(t("saved_docx"));
    } else if (format === "gdocs") {
      navigator.clipboard.writeText(protocolWithFooter);
      window.open("https://docs.google.com/document/create", "_blank");
      toast.success(t("google_docs_hint"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-mono text-sm font-semibold">{t("protocol")}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && !protocol && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("generating")}</span>
            </div>
          )}
          {protocol && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {protocol}
                {isLoading && (
                  <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            </div>
          )}
        </div>

        {protocol && (
          <div className="flex flex-wrap gap-2 p-5 border-t border-border">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("copy")} disabled={!canSave}>
              <Copy className="h-3.5 w-3.5" /> {t("copy")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("txt")} disabled={!canSave}>
              <FileText className="h-3.5 w-3.5" /> TXT
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("docx")} disabled={!canSave}>
              <Download className="h-3.5 w-3.5" /> DOCX
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("gdocs")} disabled={!canSave}>
              <ExternalLink className="h-3.5 w-3.5" /> Google Docs
            </Button>
            {canSave && (
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => {
                  const preview = protocolWithFooter.slice(0, 500);
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(preview)}`, "_blank");
                }} title="Telegram">📨</Button>
                <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => {
                  const preview = protocolWithFooter.slice(0, 500);
                  window.open(`https://wa.me/?text=${encodeURIComponent(preview)}`, "_blank");
                }} title="WhatsApp">💬</Button>
                <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => {
                  const preview = protocolWithFooter.slice(0, 200);
                  window.open(`https://connect.ok.ru/offer?url=${encodeURIComponent(window.location.origin)}&title=${encodeURIComponent(preview)}`, "_blank");
                }} title="Max">🟠</Button>
              </div>
            )}
            {!isComplete && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("loading")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingProtocolPanel;
