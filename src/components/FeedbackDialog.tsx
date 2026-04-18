import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artifactType: string;
}

type Step = "rating" | "improvements" | "thanks";

const FeedbackDialog = ({ isOpen, onClose, artifactType }: FeedbackDialogProps) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const IMPROVEMENT_OPTIONS = [
    t("speed"),
    t("transcription_quality"),
    t("artifact_quality"),
    t("ui_convenience"),
    t("other"),
  ];

  const reset = () => {
    setStep("rating");
    setRating(0);
    setHoveredStar(0);
    setSelectedImprovements([]);
    setCustomFeedback("");
    setShowCustomInput(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitFeedback = async (finalRating: number, improvements: string[], custom: string) => {
    if (!user) return;
    try {
      await supabase.from("feedback").insert({
        user_id: user.id,
        rating: finalRating,
        improvement_areas: improvements,
        custom_feedback: custom || null,
        artifact_type: artifactType,
      });
    } catch (e) {
      console.error("Failed to submit feedback:", e);
    }
  };

  const handleRatingSelect = async (stars: number) => {
    setRating(stars);
    if (stars === 5) {
      await submitFeedback(stars, [], "");
      setStep("thanks");
    } else {
      setStep("improvements");
    }
  };

  const handleImprovementsSubmit = async () => {
    await submitFeedback(rating, selectedImprovements, customFeedback);
    setStep("thanks");
  };

  const toggleImprovement = (item: string) => {
    if (item === t("other")) {
      setShowCustomInput(!showCustomInput);
      if (selectedImprovements.includes(item)) {
        setSelectedImprovements(prev => prev.filter(i => i !== item));
      } else {
        setSelectedImprovements(prev => [...prev, item]);
      }
      return;
    }
    setSelectedImprovements(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-mono text-sm font-semibold">
            {step === "rating" && t("rate_service")}
            {step === "improvements" && t("what_to_improve")}
            {step === "thanks" && t("thanks")}
          </h3>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-5">
          {step === "rating" && (
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRatingSelect(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}

          {step === "improvements" && (
            <div className="space-y-3">
              {IMPROVEMENT_OPTIONS.map(item => (
                <button
                  key={item}
                  onClick={() => toggleImprovement(item)}
                  className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                    selectedImprovements.includes(item)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
              {showCustomInput && (
                <Textarea
                  placeholder={t("describe_improvement")}
                  value={customFeedback}
                  onChange={e => setCustomFeedback(e.target.value)}
                  className="text-sm"
                  rows={3}
                />
              )}
              <Button
                onClick={handleImprovementsSubmit}
                className="w-full gap-1.5 text-xs"
                size="sm"
                disabled={selectedImprovements.length === 0}
              >
                <Check className="h-3.5 w-3.5" /> {t("send")}
              </Button>
            </div>
          )}

          {step === "thanks" && (
            <div className="text-center space-y-3">
              <div className="text-4xl">🙏</div>
              <p className="text-sm text-muted-foreground">
                {t("thanks_feedback")}
              </p>
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                {t("close")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDialog;
