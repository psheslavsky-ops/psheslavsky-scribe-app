import { LANGUAGES, useI18n } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const LanguageSwitcher = () => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Language"
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <Globe className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[176px] max-h-[320px] overflow-y-auto"
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.05)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Globe className="h-3 w-3 text-primary" />
              </div>
              <span className="font-mono text-xs font-semibold text-foreground">Язык</span>
            </div>
          </div>

          {/* Language list */}
          <div className="py-1.5">
            {LANGUAGES.map(l => {
              const isActive = l.code === lang;
              return (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 transition-all font-mono text-xs ${
                    isActive
                      ? "text-primary bg-primary/6"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/8"
                  }`}
                >
                  {/* Flag emoji */}
                  <span className="text-base leading-none w-5 text-center flex-shrink-0">
                    {l.flag}
                  </span>
                  {/* Lang name */}
                  <span className={`flex-1 text-left text-xs ${isActive ? "font-semibold text-primary" : ""}`}>
                    {l.label}
                  </span>
                  {/* Active checkmark */}
                  {isActive && (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
