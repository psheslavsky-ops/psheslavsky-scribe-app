import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Download, Copy, FileText, ExternalLink, Share2 } from "lucide-react";
import { exportToTxt, exportToDocx } from "@/lib/export";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { useI18n } from "@/lib/i18n";

export type DocumentType = "meeting-protocol" | "business-requirements" | "vision-scope" | "meeting-summary" | "user-stories" | "use-cases" | "flowchart";

const DOC_META: Record<DocumentType, { titleKey: string; fileName: string }> = {
  "meeting-protocol": { titleKey: "protocol", fileName: "protocol" },
  "business-requirements": { titleKey: "business_reqs", fileName: "business-requirements" },
  "vision-scope": { titleKey: "vision_scope", fileName: "vision-scope" },
  "meeting-summary": { titleKey: "summary", fileName: "meeting-summary" },
  "user-stories": { titleKey: "user_stories", fileName: "user-stories" },
  "use-cases": { titleKey: "use_cases", fileName: "use-cases" },
  "flowchart": { titleKey: "flowchart", fileName: "flowchart" },
};

const SCRIBE_FOOTER = '\n\n---\nСоздано в "Scribe". Попробуйте бесплатно';

interface DocumentGeneratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  documentType: DocumentType;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function ensureCompleteXml(xml: string): string {
  let result = xml.trim();
  // Remove markdown code block wrappers if present
  if (result.startsWith("```")) {
    result = result.replace(/^```[^\n]*\n/, "").replace(/\n```\s*$/, "");
  }
  // Ensure closing tags
  if (!result.includes("</root>")) result += "\n      </root>";
  if (!result.includes("</mxGraphModel>")) result += "\n    </mxGraphModel>";
  if (!result.includes("</diagram>")) result += "\n  </diagram>";
  if (!result.includes("</mxfile>")) result += "\n</mxfile>";
  return result;
}

const DocumentGeneratorPanel = ({ isOpen, onClose, transcript, documentType }: DocumentGeneratorPanelProps) => {
  const { t } = useI18n();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setContent("");
    setIsComplete(false);
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${documentType}`, {
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
        toast.error(err.error || "Error generating document");
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
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setContent(accumulated);
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
        toast.error("Error generating document");
      }
    } finally {
      setIsLoading(false);
    }
  }, [transcript, documentType]);

  useEffect(() => {
    if (isOpen && transcript) {
      generate();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [isOpen, transcript, generate]);

  if (!isOpen) return null;

  const meta = DOC_META[documentType];
  const isFlowchart = documentType === "flowchart";
  const contentWithFooter = content + SCRIBE_FOOTER;
  const canSave = isComplete && content.length > 0;

  const handleSave = (format: "txt" | "docx" | "drawio" | "copy" | "gdocs") => {
    if (!canSave) {
      toast.info(t("wait_full_load"));
      return;
    }

    if (format === "copy") {
      navigator.clipboard.writeText(contentWithFooter);
      toast.success(t("copied"));
    } else if (format === "txt") {
      exportToTxt(contentWithFooter, meta.fileName);
      toast.success(t("saved_txt"));
    } else if (format === "docx") {
      exportToDocx(contentWithFooter, meta.fileName);
      toast.success(t("saved_docx"));
    } else if (format === "drawio") {
      const fixedXml = ensureCompleteXml(content);
      const blob = new Blob([fixedXml], { type: "application/xml;charset=utf-8" });
      saveAs(blob, `${meta.fileName}.drawio`);
      toast.success(t("saved_drawio"));
    } else if (format === "gdocs") {
      navigator.clipboard.writeText(contentWithFooter);
      window.open("https://docs.google.com/document/create", "_blank");
      toast.success(t("google_docs_hint"));
    }
  };

  const handleShareMessenger = (messenger: "telegram" | "whatsapp" | "max") => {
    const preview = contentWithFooter.slice(0, 500) + (contentWithFooter.length > 500 ? "..." : "");
    const urls: Record<string, string> = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(preview)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(preview)}`,
      max: `https://connect.ok.ru/offer?url=${encodeURIComponent(window.location.origin)}&title=${encodeURIComponent(preview.slice(0, 200))}`,
    };
    window.open(urls[messenger], "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-mono text-sm font-semibold">{t(meta.titleKey)}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && !content && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("generating")}</span>
            </div>
          )}
          {content && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {content}
              {isLoading && (
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>

        {content && (
          <div className="flex flex-wrap gap-2 p-5 border-t border-border">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("copy")} disabled={!canSave}>
              <Copy className="h-3.5 w-3.5" /> {t("copy")}
            </Button>
            {isFlowchart ? (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("drawio")} disabled={!canSave}>
                <Download className="h-3.5 w-3.5" /> .drawio
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("txt")} disabled={!canSave}>
                  <FileText className="h-3.5 w-3.5" /> TXT
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("docx")} disabled={!canSave}>
                  <Download className="h-3.5 w-3.5" /> DOCX
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSave("gdocs")} disabled={!canSave}>
                  <ExternalLink className="h-3.5 w-3.5" /> Google Docs
                </Button>
              </>
            )}
            {/* Share in messengers */}
            {canSave && !isFlowchart && (
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => handleShareMessenger("telegram")} title="Telegram">
                  📨
                </Button>
                <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => handleShareMessenger("whatsapp")} title="WhatsApp">
                  💬
                </Button>
                <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => handleShareMessenger("max")} title="Max">
                  🟠
                </Button>
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

export default DocumentGeneratorPanel;
