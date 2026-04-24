import { useState, useCallback, useEffect, useRef } from "react";
import { X, Download, FileText, Copy, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { exportToTxt, exportToDocx } from "@/lib/export";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props { isOpen: boolean; onClose: () => void; transcript: string; }

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SCRIBE_FOOTER = '\n\n---\nСоздано в "Scribe". Попробуйте бесплатно';

const MeetingProtocolPanel = ({ isOpen, onClose, transcript }: Props) => {
  const { t } = useI18n();
  const [protocol, setProtocol]     = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true); setProtocol(""); setIsComplete(false);
    abortRef.current = new AbortController();
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/meeting-protocol`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ transcript }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Error generating protocol");
        setIsLoading(false); return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let ni: number;
        while ((ni = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, ni); buf = buf.slice(ni + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || !line.startsWith("data: ")) continue;
          const js = line.slice(6).trim();
          if (js === "[DONE]") break;
          try {
            const p = JSON.parse(js);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setProtocol(acc); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      setIsComplete(true);
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Error generating protocol");
    } finally { setIsLoading(false); }
  }, [transcript]);

  useEffect(() => {
    if (isOpen && transcript) generate();
    return () => { abortRef.current?.abort(); };
  }, [isOpen, transcript, generate]);

  if (!isOpen) return null;

  const canSave    = isComplete && protocol.length > 0;
  const withFooter = protocol + SCRIBE_FOOTER;

  const handleSave = (fmt: "copy" | "txt" | "docx" | "gdocs") => {
    if (!canSave) { toast.info(t("wait_full_load")); return; }
    if (fmt === "copy") {
      navigator.clipboard.writeText(withFooter);
      toast.success(t("copied"));
    } else if (fmt === "txt") {
      exportToTxt(withFooter, "protocol");
      toast.success(t("saved_txt"));
    } else if (fmt === "docx") {
      exportToDocx(withFooter, "protocol");
      toast.success("DOCX сохранён");
    } else if (fmt === "gdocs") {
      navigator.clipboard.writeText(withFooter);
      const title = encodeURIComponent("Протокол встречи — Scribe_");
      window.open(`https://docs.google.com/document/create?title=${title}`, "_blank");
      toast.success("Документ открыт. Вставьте содержимое (Ctrl+V)");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.06)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">{t("protocol")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? "Генерация..." : isComplete ? "Готово" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && !protocol && (
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              </div>
              <span className="font-mono text-sm">{t("generating")}</span>
            </div>
          )}
          {protocol && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-mono">
              {protocol}
              {isLoading && (
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {protocol && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button onClick={() => handleSave("copy")} disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40">
              <Copy className="h-3.5 w-3.5" /> {t("copy")}
            </button>
            <button onClick={() => handleSave("txt")} disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40">
              <FileText className="h-3.5 w-3.5" /> TXT
            </button>
            <button onClick={() => handleSave("docx")} disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> DOCX
            </button>
            <button onClick={() => handleSave("gdocs")} disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40">
              <ExternalLink className="h-3.5 w-3.5" /> Google Docs
            </button>
            {!isComplete && (
              <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground ml-auto">
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
