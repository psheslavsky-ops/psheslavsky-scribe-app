import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render only after mount
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 w-8 rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
      title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
    >
      {/* Show Moon when light (to switch to dark), Sun when dark (to switch to light) */}
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
      <span className="sr-only">Переключить тему</span>
    </Button>
  );
};

export default ThemeToggle;
