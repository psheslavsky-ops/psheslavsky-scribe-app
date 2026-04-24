import { Button } from "@/components/ui/button";
import { X, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TelegramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L0 24l6.335-1.508A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 0 1-5.003-1.376l-.36-.213-3.727.977.995-3.634-.234-.373A9.79 9.79 0 0 1 2.182 12C2.182 6.579 6.579 2.182 12 2.182S21.818 6.579 21.818 12 17.421 21.818 12 21.818z"/>
  </svg>
);

const VKIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077FF">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-.85-1.49.276v1.437c0 .396-.127.616-1.17.616-1.72 0-3.63-1.041-4.975-2.983C6.21 12.283 5.6 9.785 5.6 9.233c0-.21.078-.395.275-.395h1.744c.198 0 .276.08.35.277.393 1.155 1.057 2.167 1.334 2.167.102 0 .15-.047.15-.303V9.05c-.033-.82-.48-1.003-.48-1.157 0-.128.103-.248.262-.248h2.743c.208 0 .276.107.276.318v3.296c0 .208.094.277.15.277.102 0 .183-.069.367-.253.943-1.063 1.617-2.696 1.617-2.696.09-.194.277-.382.617-.382h1.744c.527 0 .644.27.527.617-.22.808-2.354 4.032-2.354 4.032-.185.3-.254.432 0 .765.185.253 1.055 1.01 1.594 1.615.99 1.107 1.75 2.037 1.95 2.683.214.63-.123.95-.65.95z"/>
  </svg>
);

const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F58529"/>
        <stop offset="50%" stopColor="#DD2A7B"/>
        <stop offset="100%" stopColor="#8134AF"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)"/>
    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const ArrowUpRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
  </svg>
);

const CHANNELS = [
  { name: "Telegram",  Icon: TelegramIcon,  bg: "rgba(42,171,238,.1)",  color: "#2AABEE", getUrl: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { name: "WhatsApp",  Icon: WhatsAppIcon,  bg: "rgba(37,211,102,.1)",  color: "#25D366", getUrl: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + " " + u)}` },
  { name: "VK",        Icon: VKIcon,        bg: "rgba(0,119,255,.1)",   color: "#0077FF", getUrl: (u: string, t: string) => `https://vk.com/share.php?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}` },
  { name: "X",         Icon: XIcon,         bg: "rgba(0,0,0,.07)",      color: "#000",    getUrl: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { name: "Instagram", Icon: InstagramIcon, bg: "rgba(221,42,123,.1)",  color: "#DD2A7B", getUrl: (u: string, _t: string) => `https://www.instagram.com/` },
  { name: "Facebook",  Icon: FacebookIcon,  bg: "rgba(24,119,242,.1)",  color: "#1877F2", getUrl: (u: string, t: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
];

const ShareDialog = ({ isOpen, onClose }: ShareDialogProps) => {
  const { t } = useI18n();
  const shareUrl  = window.location.origin;
  const shareText = "Попробуй Scribe_ — сервис транскрибации бизнес-аналитика с ИИ-артефактами!";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("copied"));
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Scribe_", text: shareText, url: shareUrl }); } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold">{t("share_friend")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Расскажи о Scribe_ коллегам</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* URL chip */}
          <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="font-mono text-xs text-primary flex-1 truncate">{shareUrl.replace("https://", "")}</span>
            <button onClick={handleCopy} className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 bg-card transition-colors">
              копировать
            </button>
          </div>

          {/* Section label */}
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
            Поделиться через
          </p>

          {/* 2×3 channel grid */}
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map(({ name, Icon, bg, color, getUrl }) => (
              <a
                key={name}
                href={getUrl(shareUrl, shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border hover:border-current transition-all duration-150"
                style={{ "--hover-color": color } as any}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.background = bg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ""; (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon />
                </div>
                <span className="font-mono text-xs font-medium text-foreground">{name}</span>
                <ArrowUpRight />
              </a>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
