import { useState, useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(){}[]|;:',.<>?/~`αβγδεζηθικλμνξοπρστυφχψω";

interface ProcessingAnimationProps {
  isActive: boolean;
}

const ProcessingAnimation = ({ isActive }: ProcessingAnimationProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  

  const generateLine = () => {
    const length = Math.floor(Math.random() * 60) + 20;
    let line = "";
    for (let i = 0; i < length; i++) {
      line += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return line;
  };

  useEffect(() => {
    if (isActive) {
      const initialLines = Array.from({ length: 8 }, () => generateLine());
      setLines(initialLines);

      intervalRef.current = setInterval(() => {
        setLines(prev => {
          const next = [...prev];
          const idx = Math.floor(Math.random() * next.length);
          next[idx] = generateLine();
          return next;
        });
      }, 60);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setLines([]);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  if (!isActive || lines.length === 0) return null;

  return (
    <div className="bg-foreground p-6 rounded overflow-hidden">
      <div className="font-mono text-xs leading-relaxed text-background/70 whitespace-pre-wrap break-all">
        {lines.map((line, i) => (
          <div key={i} className="opacity-80">{line}</div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingAnimation;
