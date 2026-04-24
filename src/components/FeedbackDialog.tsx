import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { X, Check, Zap, Mic2, Sparkles, Layout, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artifactType: string;
}

type Step = "rating" | "improvements" | "thanks";

// Icon map for improvement options
const OPTION_ICONS: Record<string, React.ReactNode> = {
  speed:                <Zap className="h-3.5 w-3.5" />,
  transcription_quality:<Mic2 className="h-3.5 w-3.5" />,
  artifact_quality:     <Sparkles className="h-3.5 w-3.5" />,
  ui_convenience:       <Layout className="h-3.5 w-3.5" />,
  other:                <MoreHorizontal className="h-3.5 w-3.5" />,
};

const STARS = [1, 2, 3, 4, 5];

const LABELS: Record<number, string> = {
  1: "Плохо",
  2: "Слабо",
  3: "Нормально",
  4: "Хорошо",
  5: "Отлично!",
};

const FeedbackDialog = ({ isOpen, onClose, artifactType }: FeedbackDialogProps) => {
  const { user }  = useAuth();
  const { t }     = useI18n();
  const [step, setStep]                         = useState<Step>("rating");
  const [rating, setRating]                     = useState(0);
  const [hovered, setHovered]                   = useState(0);
  const [selected, setSelected]                 = useState<string[]>([]);
  const [custom, setCustom]                     = useState("");
  const [showCustom, setShowCustom]             = useState(false);

  const OPTIONS_KEYS = ["speed", "transcription_quality", "artifact_quality", "ui_convenience", "other"];

  const reset = () => {
    setStep("rating"); setRating(0); setHovered(0);
    setSelected([]); setCustom(""); setShowCustom(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async (r: number, imp: string[], c: string) => {
    if (!user) return;
    try {
      await supabase.from("feedback").insert({
        user_id: user.id, rating: r,
        improvement_areas: imp, custom_feedback: c || null, artifact_type: artifactType,
      });
    } catch {}
  };

  const handleStar = async (s: number) => {
    setRating(s);
    if (s === 5) { await submit(s, [], ""); setStep("thanks"); }
    else setStep("improvements");
  };

  const toggleOpt = (key: string) => {
    if (key === "other") { setShowCustom(p => !p); }
    setSelected(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
  };

  const handleSubmitImprovements = async () => {
    await submit(rating, selected.map(k => t(k as any)), custom);
    setStep("thanks");
  };

  if (!isOpen) return null;

  const active = hovered || rating;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {step === "thanks"
                ? <Check className="h-3.5 w-3.5 text-green-500" />
                : <Sparkles className="h-3.5 w-3.5 text-primary" />
              }
            </div>
            <div>
              <p className="font-mono text-sm font-semibold">
                {step === "rating"      && t("rate_service")}
                {step === "improvements" && t("what_to_improve")}
                {step === "thanks"       && t("thanks")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === "rating"      && "Ваше мнение важно для нас"}
                {step === "improvements" && "Можно выбрать несколько"}
                {step === "thanks"       && "Отзыв отправлен"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* Step: Rating */}
          {step === "rating" && (
            <div className="space-y-4">
              <div className="flex justify-center gap-2 py-2">
                {STARS.map(s => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => handleStar(s)}
                    className="transition-all hover:scale-110 active:scale-95"
                  >
                    <svg
                      width="36" height="36" viewBox="0 0 24 24"
                      fill={s <= active ? "hsl(220,100%,50%)" : "none"}
                      stroke={s <= active ? "hsl(220,100%,50%)" : "hsl(0,0%,75%)"}
                      strokeWidth="1.5"
                      className="transition-all duration-100"
                      style={{ filter: s <= active ? "drop-shadow(0 0 6px hsla(220,100%,50%,.4))" : "none" }}
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  </button>
                ))}
              </div>
              {/* Rating label */}
              <div className="text-center">
                <span className="font-mono text-sm font-medium text-primary transition-all">
                  {active ? LABELS[active] : "\u00A0"}
                </span>
              </div>
            </div>
          )}

          {/* Step: Improvements */}
          {step === "improvements" && (
            <div className="space-y-2">
              {OPTIONS_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => toggleOpt(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-mono transition-all ${
                    selected.includes(key)
                      ? "border-primary bg-primary/8 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={selected.includes(key) ? "text-primary" : "text-muted-foreground"}>
                    {OPTION_ICONS[key]}
                  </span>
                  {t(key as any)}
                  {selected.includes(key) && (
                    <span className="ml-auto">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </span>
                  )}
                </button>
              ))}
              {showCustom && (
                <Textarea
                  placeholder={t("describe_improvement")}
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  className="text-sm rounded-xl mt-1"
                  rows={2}
                />
              )}
              <button
                onClick={handleSubmitImprovements}
                disabled={selected.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                <Check className="h-3.5 w-3.5" />
                {t("send")}
              </button>
            </div>
          )}

          {/* Step: Thanks */}
          {step === "thanks" && (
            <div className="text-center space-y-4 py-2">
              {/* Animated checkmark */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="1.5" strokeOpacity=".3"/>
                  <polyline points="7 12.5 10.5 16 17 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-foreground mb-1">
                  {t("thanks")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("thanks_feedback")}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="inline-flex items-center justify-center px-5 py-2 rounded-xl border border-border font-mono text-xs text-foreground hover:bg-muted transition-colors"
              >
                {t("close")}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FeedbackDialog;
