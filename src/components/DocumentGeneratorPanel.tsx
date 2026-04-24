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
  "meeting-protocol":      { titleKey: "protocol",       fileName: "protocol",             Icon: Sparkles,       color: "hsla(220,100%,50%,.1)"  },
  "business-requirements": { titleKey: "business_reqs",  fileName: "business-requirements", Icon: ClipboardList,  color: "hsla(220,100%,50%,.1)"  },
  "vision-scope":          { titleKey: "vision_scope",   fileName: "vision-scope",          Icon: Target,         color: "hsla(220,100%,50%,.1)"  },
  "meeting-summary":       { titleKey: "summary",        fileName: "meeting-summary",       Icon: Brain,          color: "hsla(220,100%,50%,.1)"  },
  "user-stories":          { titleKey: "user_stories",   fileName: "user-stories",          Icon: BookOpen,       color: "hsla(220,100%,50%,.1)"  },
  "use-cases":             { titleKey: "use_cases",      fileName: "use-cases",             Icon: Users,          color: "hsla(220,100%,50%,.1)"  },
  "flowchart":             { titleKey: "flowchart",      fileName: "flowchart",             Icon: GitBranch,      color: "hsla(220,100%,50%,.1)"  },
};

const SCRIBE_FOOTER = '\n\n---\nСоздано в "Scribe". Попробуйте бесплатно';
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;

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
  const [content, setContent]       = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true); setContent(""); setIsComplete(false);
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
            if (d) { acc += d; setContent(acc); }
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
  const withFooter  = content + SCRIBE_FOOTER;
  const canSave     = isComplete && content.length > 0;

  const handleSave = (fmt: "copy" | "txt" | "docx" | "drawio" | "gdocs") => {
    if (!canSave) { toast.info(t("wait_full_load")); return; }
    if (fmt === "copy") {
      navigator.clipboard.writeText(withFooter);
      toast.success(t("copied"));
    } else if (fmt === "txt") {
      exportToTxt(withFooter, meta.fileName);
      toast.success(t("saved_txt"));
    } else if (fmt === "docx") {
      exportToDocx(withFooter, meta.fileName);
      toast.success("DOCX сохранён");
    } else if (fmt === "drawio") {
      const blob = new Blob([ensureCompleteXml(content)], { type: "application/xml;charset=utf-8" });
      saveAs(blob, `${meta.fileName}.drawio`);
      toast.success(t("saved_drawio"));
    } else if (fmt === "gdocs") {
      // Copy content + open Google Docs with pre-filled title
      navigator.clipboard.writeText(withFooter);
      const title = encodeURIComponent(t(meta.titleKey as any) + " — Scribe_");
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: meta.color }}>
              <IconComp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">{t(meta.titleKey as any)}</p>
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
          {isLoading && !content && (
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              </div>
              <span className="font-mono text-sm">{t("generating")}</span>
            </div>
          )}
          {content && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-mono">
              {content}
              {isLoading && (
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {content && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => handleSave("copy")} disabled={!canSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" /> {t("copy")}
            </button>

            {isFlowchart ? (
              <>
                <button
                  onClick={() => handleSave("drawio")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> .drawio
                </button>
                <button
                  onClick={() => {
                    if (!canSave) { toast.info(t("wait_full_load")); return; }
                    const xml = ensureCompleteXml(content);
                    // draw.io supports opening XML via #R + URL-encoded content
                    const url = `https://app.diagrams.net/#R${encodeURIComponent(xml)}`;
                    window.open(url, "_blank");
                  }}
                  disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Открыть диаграмму
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSave("txt")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <FileText className="h-3.5 w-3.5" /> TXT
                </button>
                <button
                  onClick={() => handleSave("docx")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> DOCX
                </button>
                <button
                  onClick={() => handleSave("gdocs")} disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
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
