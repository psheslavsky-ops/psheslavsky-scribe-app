import { Button } from "@/components/ui/button";
import { Copy, Download, FileText, Trash2, ChevronDown, ChevronRight, Sparkles, ClipboardList, Target, Brain, BookOpen, Users, GitBranch } from "lucide-react";
import { exportToTxt, exportToDocx } from "@/lib/export";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export type TranscriptWord = {
  text: string;
  start: number;
  end: number;
  speaker?: string;
};

export type TranscriptEntry = {
  id: string;
  fileName: string;
  status: "processing" | "completed" | "error";
  text?: string;
  words?: TranscriptWord[];
  speakers?: string[];
  timestamp: Date;
  errorMessage?: string;
};

interface TranscriptViewProps {
  entry: TranscriptEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onGenerateProtocol: (text: string) => void;
  onGenerateBusinessReqs: (text: string) => void;
  onGenerateVisionScope: (text: string) => void;
  onGenerateSummary: (text: string) => void;
  onGenerateUserStories: (text: string) => void;
  onGenerateUseCases: (text: string) => void;
  onGenerateFlowchart: (text: string) => void;
}

const TranscriptView = ({
  entry, isExpanded, onToggle, onDelete,
  onGenerateProtocol, onGenerateBusinessReqs, onGenerateVisionScope,
  onGenerateSummary, onGenerateUserStories, onGenerateUseCases, onGenerateFlowchart,
}: TranscriptViewProps) => {
  const { t, lang } = useI18n();

  // Map language code to locale for date formatting
  const LOCALE_MAP: Record<string, string> = {
    ru: "ru-RU", en: "en-US", de: "de-DE", es: "es-ES",
    fr: "fr-FR", pt: "pt-BR", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", ar: "ar-SA",
  };
  const dateLocale = LOCALE_MAP[lang] || "en-US";

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.text || "");
    toast.success(t("copied"));
  };

  const handleExportTxt = () => {
    exportToTxt(entry.text || "", entry.fileName.replace(/\.[^.]+$/, ""));
    toast.success(t("saved_txt"));
  };

  const handleExportDocx = async () => {
    await exportToDocx(entry.text || "", entry.fileName.replace(/\.[^.]+$/, ""));
    toast.success(t("saved_docx"));
  };

  return (
    <div className="border-b border-border">
      <div
        className="flex items-center justify-between py-4 cursor-pointer group"
        onClick={() => entry.status === "completed" && onToggle()}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {entry.status === "completed" && (
            isExpanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-mono text-sm text-foreground truncate">{entry.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entry.timestamp.toLocaleString(dateLocale)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <span className={`font-mono text-xs ${
            entry.status === "processing" ? "text-primary" :
            entry.status === "completed" ? "text-emerald-600 dark:text-emerald-400" :
            "text-destructive"
          }`}>
            {entry.status === "processing" && t("processing")}
            {entry.status === "completed" && t("done")}
            {entry.status === "error" && t("error")}
          </span>
          <button
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && entry.status === "completed" && entry.text && (
        <div className="pb-6 space-y-4">
          <div className="space-y-3">
            {/* Export row */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" /> {t("copy")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportTxt} className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> TXT
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportDocx} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> DOCX
              </Button>
            </div>
            {/* AI generation row 1: Резюме, Протокол, Бизнес-требования */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="default" size="sm" onClick={() => onGenerateSummary(entry.text!)} className="gap-1.5 text-xs">
                <Brain className="h-3.5 w-3.5 shrink-0" /> {t("summary")}
              </Button>
              <Button variant="default" size="sm" onClick={() => onGenerateProtocol(entry.text!)} className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> {t("protocol")}
              </Button>
              <Button variant="default" size="sm" onClick={() => onGenerateBusinessReqs(entry.text!)} className="gap-1.5 text-xs">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" /> {t("business_reqs")}
              </Button>
            </div>
            {/* AI generation row 2: Концепция, Польз. история, Вариант использования, Блок-схема */}
            <div className="grid grid-cols-4 gap-2">
              <Button variant="default" size="sm" onClick={() => onGenerateVisionScope(entry.text!)} className="gap-1.5 text-xs">
                <Target className="h-3.5 w-3.5 shrink-0" /> {t("vision_scope")}
              </Button>
              <Button variant="default" size="sm" onClick={() => onGenerateUserStories(entry.text!)} className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5 shrink-0" /> {t("user_stories")}
              </Button>
              <Button variant="default" size="sm" onClick={() => onGenerateUseCases(entry.text!)} className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5 shrink-0" /> {t("use_cases")}
              </Button>
              <Button variant="default" size="sm" onClick={() => onGenerateFlowchart(entry.text!)} className="gap-1.5 text-xs">
                <GitBranch className="h-3.5 w-3.5 shrink-0" /> {t("flowchart")}
              </Button>
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-card border border-border rounded-lg p-5 max-h-96 overflow-y-auto">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {entry.text}
            </p>
          </div>
        </div>
      )}

      {entry.status === "error" && entry.errorMessage && (
        <div className="pb-4">
          <p className="text-xs text-destructive">{entry.errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default TranscriptView;
