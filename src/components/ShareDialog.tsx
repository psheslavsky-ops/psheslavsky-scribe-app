import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareDialog = ({ isOpen, onClose }: ShareDialogProps) => {
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const shareUrl = window.location.origin;
  const shareText = "Попробуй Scribe_ — сервис транскрибации бизнес-аналитика с ИИ-артефактами!";

  const mainChannels = [
    {
      name: "Telegram",
      icon: "📨",
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "WhatsApp",
      icon: "💬",
      url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
    },
    {
      name: "Max (OK)",
      icon: "🟠",
      url: `https://connect.ok.ru/offer?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Instagram",
      icon: "📸",
      url: `https://www.instagram.com/`,
    },
  ];

  const moreChannels = [
    {
      name: "VK",
      icon: "🔵",
      url: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
    },
    {
      name: "X (Twitter)",
      icon: "🐦",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Facebook",
      icon: "📘",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("link_copied"));
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Scribe_", text: shareText, url: shareUrl });
      } catch {}
    }
  };

  if (!isOpen) return null;

  const renderChannel = (ch: typeof mainChannels[0]) => (
    <a
      key={ch.name}
      href={ch.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="text-lg">{ch.icon}</span>
      <span className="text-sm font-medium text-foreground">{ch.name}</span>
      <Send className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
    </a>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <h3 className="font-mono text-sm font-semibold">{t("share_friend")}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-5 space-y-3">
          {mainChannels.map(renderChannel)}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-1.5 text-muted-foreground"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t("more")}
          </Button>

          {showMore && (
            <div className="space-y-3">
              {moreChannels.map(renderChannel)}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-1 text-xs">
              {t("copy_link")}
            </Button>
            {typeof navigator.share === "function" && (
              <Button variant="outline" size="sm" onClick={handleNativeShare} className="flex-1 text-xs">
                {t("more")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
