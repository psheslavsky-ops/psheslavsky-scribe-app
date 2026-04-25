import { useState, useCallback, useEffect, useRef } from "react";
import { X, Download, Copy, FileText, ExternalLink, Loader2, Sparkles, GitBranch, Brain, ClipboardList, Target, BookOpen, Users } from "lucide-react";
import { exportToTxt, exportToDocx } from "@/lib/export";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { useI18n } from "@/lib/i18n";

export type DocumentType =
  | "meeting-protocol"
  | "business-requirements"
  | "vision-scope"
  | "meeting-summary"
  | "user-stories"
  | "use-cases"
  | "flowchart";

const DOC_META: Record<DocumentType, { titleKey: string; fileName: string; Icon: any; color: string }> = {
  "meeting-protocol":      { titleKey: "protocol",       fileName: "protocol",             Icon: Sparkles,       color: "hsla(220,100%,50%,.1)" },
  "business-requirements": { titleKey: "business_reqs",  fileName: "business-requirements", Icon: ClipboardList,  color: "hsla(220,100%,50%,.1)" },
  "vision-scope":          { titleKey: "vision_scope",   fileName: "vision-scope",          Icon: Target,         color: "hsla(220,100%,50%,.1)" },
  "meeting-summary":       { titleKey: "summary",        fileName: "meeting-summary",       Icon: Brain,          color: "hsla(220,100%,50%,.1)" },
  "user-stories":          { titleKey: "user_stories",   fileName: "user-stories",          Icon: BookOpen,       color: "hsla(220,100%,50%,.1)" },
  "use-cases":             { titleKey: "use_cases",      fileName: "use-cases",             Icon: Users,          color: "hsla(220,100%,50%,.1)" },
  "flowchart":             { titleKey: "flowchart",      fileName: "flowchart",             Icon: GitBranch,      color: "hsla(220,100%,50%,.1)" },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format date as DD.MM.YYYY */
function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Strip * and # symbols */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")   // headings: ### Title → Title
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")  // bold/italic: **text** → text
    .replace(/^\s*[-*]\s/gm, "")  // bullet points: - item → item
    .replace(/\*/g, "")           // any remaining *
    .replace(/#/g, "");           // any remaining #
}

/** Inject date line after first line (title) */
function injectDate(text: string, date: string): string {
  const lines = text.split("\n");
  if (lines.length === 0) return text;
  // Find first non-empty line (title)
  const titleIdx = lines.findIndex(l => l.trim().length > 0);
  if (titleIdx === -1) return text;
  lines.splice(titleIdx + 1, 0, `Дата: ${date}`);
  return lines.join("\n");
}

/** Build final document: strip markdown, inject date, append footer */
function buildDocument(raw: string, date: string, docType?: string): string {
  let text = stripMarkdown(raw);
  text = injectDate(text, date);
  return text.trimEnd() + "\n\nБизнес-аналитик     А.И. Пшеславский";
}

/** Determine line type for rendering */
type LineType = "title" | "date" | "heading" | "empty" | "body" | "footer";
function lineType(line: string, idx: number, lines: string[]): LineType {
  const t = line.trim();
  if (!t) return "empty";
  // Title = first non-empty line
  const firstNonEmpty = lines.findIndex(l => l.trim());
  if (idx === firstNonEmpty) return "title";
  // Date line
  if (t.startsWith("Дата:")) return "date";
  // Footer
  if (t === "Бизнес-аналитик") return "footer";
  // Heading = starts with digit+dot or short uppercase-ish line
  if (/^\d+\./.test(t) || /^\d+\.\d+\./.test(t)) return "heading";
  return "body";
}

function ensureCompleteXml(xml: string): string {
  let r = xml.trim().replace(/^```[^\n]*\n/, "").replace(/\n```\s*$/, "");
  if (!r.includes("</root>"))        r += "\n</root>";
  if (!r.includes("</mxGraphModel>")) r += "\n</mxGraphModel>";
  if (!r.includes("</diagram>"))     r += "\n</diagram>";
  if (!r.includes("</mxfile>"))      r += "\n</mxfile>";
  return r;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  documentType: DocumentType;
}

const DocumentGeneratorPanel = ({ isOpen, onClose, transcript, documentType }: Props) => {
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
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${documentType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ transcript }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Error generating document");
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
            const d = p.choices?.[0]?.delta?.content;
            if (d) { acc += d; setRawContent(acc); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      setIsComplete(true);
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Error generating document");
    } finally { setIsLoading(false); }
  }, [transcript, documentType]);

  useEffect(() => {
    if (isOpen && transcript) generate();
    return () => { abortRef.current?.abort(); };
  }, [isOpen, transcript, generate]);

  if (!isOpen) return null;

  const meta       = DOC_META[documentType];
  const IconComp   = meta.Icon;
  const isFlowchart = documentType === "flowchart";

  // Build the formatted document for display and export
  // Flowchart stays as raw XML — no date/footer/markdown stripping
  const formattedContent = rawContent
    ? (isFlowchart ? rawContent : buildDocument(rawContent, genDate, documentType))
    : "";
  const canSave = isComplete && rawContent.length > 0;

  const handleSave = (fmt: "copy" | "txt" | "docx" | "drawio" | "gdocs") => {
    if (!canSave) { toast.info(t("wait_full_load")); return; }
    const exportText = formattedContent;
    if (fmt === "copy") {
      navigator.clipboard.writeText(exportText);
      toast.success(t("copied"));
    } else if (fmt === "txt") {
      exportToTxt(exportText, meta.fileName);
      toast.success(t("saved_txt"));
    } else if (fmt === "docx") {
      exportToDocx(exportText, meta.fileName);
      toast.success("DOCX сохранён");
    } else if (fmt === "drawio") {
      const blob = new Blob([ensureCompleteXml(rawContent)], { type: "application/xml;charset=utf-8" });
      saveAs(blob, `${meta.fileName}.drawio`);
      toast.success(t("saved_drawio"));
    } else if (fmt === "gdocs") {
      navigator.clipboard.writeText(exportText);
      const title = encodeURIComponent(t(meta.titleKey as any) + " — Scribe_");
      window.open(`https://docs.google.com/document/create?title=${title}`, "_blank");
      toast.success("Документ открыт. Вставьте содержимое (Ctrl+V)");
    }
  };

  // Render formatted lines
  const renderContent = (text: string, streaming: boolean) => {
    const lines = text.split("\n");
    return (
      <div style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        {lines.map((line, idx) => {
          const type = lineType(line, idx, lines);
          const trimmed = line.trim();
          if (type === "empty") return <div key={idx} style={{ height: "0.6em" }} />;
          if (type === "title") return (
            <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "16px", fontWeight: 700, textAlign: "left", marginBottom: "4px", color: "var(--foreground)" }}>
              {trimmed}
            </p>
          );
          if (type === "date") return (
            <p key={idx} style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "left", marginBottom: "16px", fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)" }}>
              {trimmed}
            </p>
          );
          if (type === "heading") return (
            <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "14px", fontWeight: 700, textAlign: "left", marginTop: "14px", marginBottom: "4px", color: "var(--foreground)" }}>
              {trimmed}
            </p>
          );
          if (type === "footer") return (
            <p key={idx} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "14px", fontWeight: 700, textAlign: "left", marginTop: "24px", paddingTop: "12px", borderTop: "1px solid var(--border)", color: "var(--foreground)" }}>
              {trimmed}
              {streaming && idx === lines.length - 1 && (
                <span style={{ display: "inline-block", width: 6, height: 14, background: "var(--primary)", borderRadius: 2, animation: "pulse 1s infinite", marginLeft: 3, verticalAlign: "text-bottom" }} />
              )}
            </p>
          );
          // body paragraph — justified with indent
          return (
            <p key={idx} style={{ fontSize: "14px", lineHeight: "1.9", textAlign: "justify", textIndent: "1.5em", marginBottom: "2px", color: "var(--foreground)" }}>
              {trimmed}
              {streaming && idx === lines.length - 1 && (
                <span style={{ display: "inline-block", width: 6, height: 14, background: "var(--primary)", borderRadius: 2, animation: "pulse 1s infinite", marginLeft: 3, verticalAlign: "text-bottom" }} />
              )}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.06)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: meta.color }}>
              <IconComp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">{t(meta.titleKey as any)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? "Генерация..." : isComplete ? `Готово · ${genDate}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && !rawContent && (
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              </div>
              <span className="font-mono text-sm">{t("generating")}</span>
            </div>
          )}
          {rawContent && !isFlowchart && renderContent(formattedContent, isLoading)}
          {rawContent && isFlowchart && (
            <div className="whitespace-pre-wrap text-xs font-mono leading-relaxed text-foreground">
              {rawContent}
              {isLoading && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {rawContent && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button onClick={() => handleSave("copy")} disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40">
              <Copy className="h-3.5 w-3.5" /> {t("copy")}
            </button>
            {isFlowchart ? (
              <>
                <button onClick={() => handleSave("drawio")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40">
                  <Download className="h-3.5 w-3.5" /> .drawio
                </button>
                <button onClick={() => { if (!canSave) { toast.info(t("wait_full_load")); return; } const xml = ensureCompleteXml(rawContent); window.open(`https://app.diagrams.net/#R${encodeURIComponent(xml)}`, "_blank"); }} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40">
                  <ExternalLink className="h-3.5 w-3.5" /> Открыть диаграмму
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleSave("txt")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40">
                  <FileText className="h-3.5 w-3.5" /> TXT
                </button>
                <button onClick={() => handleSave("docx")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40">
                  <Download className="h-3.5 w-3.5" /> DOCX
                </button>
                <button onClick={() => handleSave("gdocs")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40">
                  <ExternalLink className="h-3.5 w-3.5" /> Google Docs
                </button>
              </>
            )}
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

export default DocumentGeneratorPanel;
