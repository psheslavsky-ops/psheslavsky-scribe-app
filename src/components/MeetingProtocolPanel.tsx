import { useState, useCallback, useEffect, useRef } from "react";
import { X, Download, FileText, Copy, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { exportToTxt, exportToDocx } from "@/lib/export";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props { isOpen: boolean; onClose: () => void; transcript: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/^\s*[-*]\s/gm, "")
    .replace(/\*/g, "")
    .replace(/#/g, "");
}

function injectDate(text: string, date: string): string {
  const lines = text.split("\n");
  const titleIdx = lines.findIndex(l => l.trim().length > 0);
  if (titleIdx === -1) return text;
  lines.splice(titleIdx + 1, 0, `Дата: ${date}`);
  return lines.join("\n");
}

function buildDocument(raw: string, date: string): string {
  let text = stripMarkdown(raw);
  text = injectDate(text, date);
  return text.trimEnd() + "\n\nБизнес-аналитик";
}

type LineType = "title" | "date" | "heading" | "empty" | "body" | "footer";
function lineType(line: string, idx: number, lines: string[]): LineType {
  const t = line.trim();
  if (!t) return "empty";
  const firstNonEmpty = lines.findIndex(l => l.trim());
  if (idx === firstNonEmpty) return "title";
  if (t.startsWith("Дата:")) return "date";
  if (t === "Бизнес-аналитик") return "footer";
  if (/^\d+\./.test(t) || /^\d+\.\d+\./.test(t)) return "heading";
  return "body";
}

function renderContent(text: string, streaming: boolean) {
  const lines = text.split("\n");
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      {lines.map((line, idx) => {
        const type = lineType(line, idx, lines);
        const trimmed = line.trim();
        const cursor = streaming && idx === lines.length - 1
          ? <span style={{ display: "inline-block", width: 6, height: 14, background: "var(--primary)", borderRadius: 2, marginLeft: 3, verticalAlign: "text-bottom", animation: "pulse 1s infinite" }} />
          : null;
        if (type === "empty") return <div key={idx} style={{ height: "0.6em" }} />;
        if (type === "title") return <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 16, fontWeight: 700, textAlign: "left", marginBottom: 4 }}>{trimmed}</p>;
        if (type === "date")  return <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 13, color: "var(--muted-foreground)", textAlign: "left", marginBottom: 16 }}>{trimmed}</p>;
        if (type === "heading") return <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 14, fontWeight: 700, textAlign: "left", marginTop: 14, marginBottom: 4 }}>{trimmed}</p>;
        if (type === "footer") return <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 14, fontWeight: 700, textAlign: "left", marginTop: 24, paddingTop: 12, borderTop: "1px solid var(--border)" }}>{trimmed}{cursor}</p>;
        return <p key={idx} style={{ fontSize: 14, lineHeight: 1.9, textAlign: "justify", textIndent: "1.5em", marginBottom: 2 }}>{trimmed}{cursor}</p>;
      })}
    </div>
  );
}

const MeetingProtocolPanel = ({ isOpen, onClose, transcript }: Props) => {
  const { t } = useI18n();
  const [rawContent, setRawContent]   = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [isComplete, setIsComplete]   = useState(false);
  const [genDate] = useState(() => formatDate(new Date()));
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true); setRawContent(""); setIsComplete(false);
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
          try { const p = JSON.parse(js); const c = p.choices?.[0]?.delta?.content; if (c) { acc += c; setRawContent(acc); } }
          catch { buf = line + "\n" + buf; break; }
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

  const formattedContent = rawContent ? buildDocument(rawContent, genDate) : "";
  const canSave = isComplete && rawContent.length > 0;

  const handleSave = (fmt: "copy" | "txt" | "docx" | "gdocs") => {
    if (!canSave) { toast.info(t("wait_full_load")); return; }
    if (fmt === "copy") { navigator.clipboard.writeText(formattedContent); toast.success(t("copied")); }
    else if (fmt === "txt") { exportToTxt(formattedContent, "protocol"); toast.success(t("saved_txt")); }
    else if (fmt === "docx") { exportToDocx(formattedContent, "protocol"); toast.success("DOCX сохранён"); }
    else if (fmt === "gdocs") {
      navigator.clipboard.writeText(formattedContent);
      window.open(`https://docs.google.com/document/create?title=${encodeURIComponent("Протокол встречи — Scribe_")}`, "_blank");
      toast.success("Документ открыт. Вставьте содержимое (Ctrl+V)");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.06)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold">{t("protocol")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isLoading ? "Генерация..." : isComplete ? `Готово · ${genDate}` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && !rawContent && (
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              </div>
              <span className="font-mono text-sm">{t("generating")}</span>
            </div>
          )}
          {rawContent && renderContent(formattedContent, isLoading)}
        </div>
        {rawContent && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button onClick={() => handleSave("copy")} disabled={!canSave} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"><Copy className="h-3.5 w-3.5" /> {t("copy")}</button>
            <button onClick={() => handleSave("txt")} disabled={!canSave} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"><FileText className="h-3.5 w-3.5" /> TXT</button>
            <button onClick={() => handleSave("docx")} disabled={!canSave} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"><Download className="h-3.5 w-3.5" /> DOCX</button>
            <button onClick={() => handleSave("gdocs")} disabled={!canSave} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"><ExternalLink className="h-3.5 w-3.5" /> Google Docs</button>
            {!isComplete && <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground ml-auto"><Loader2 className="h-3 w-3 animate-spin" /> {t("loading")}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingProtocolPanel;
