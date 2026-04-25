import {
  Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

const FONT  = "Times New Roman";
const SZ    = 28;   // 14pt
const SZ16  = 32;   // 16pt
const BLACK = "000000";
const FL    = 709;  // firstLine ≈1.25cm

/* ─── Strip markdown ───────────────────────────────────────────────────────── */
function strip(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/^\s*[-–]\s+/gm, "")
    .replace(/\*/g, "")
    .replace(/#/g, "")
    .replace(/\r\n/g, "\n");
}

/* ─── Text run helpers ─────────────────────────────────────────────────────── */
const R = (t: string, bold = false, italics = false, sz = SZ): TextRun =>
  new TextRun({ text: t, font: FONT, size: sz, bold, italics, color: BLACK });

/* ─── Paragraph builders ───────────────────────────────────────────────────── */
const pEmpty = () => new Paragraph({ children: [R("")], spacing: { after: 40 } });

const pTitle = (t: string) => new Paragraph({
  children: [R(t, true, false, SZ16)],
  alignment: AlignmentType.LEFT,
  indent: { firstLine: FL },
  spacing: { after: 80 },
});

// "Дата:" bold + value normal / "Участники:" bold + value normal
const pMeta = (t: string) => {
  const ci = t.indexOf(": ");
  return new Paragraph({
    children: ci !== -1 ? [R(t.slice(0, ci + 1), true), R(t.slice(ci + 1))] : [R(t, true)],
    alignment: AlignmentType.LEFT,
    indent: { firstLine: FL },
    spacing: { after: 200 },
  });
};

const pBody = (t: string) => new Paragraph({
  children: [R(t)],
  alignment: AlignmentType.BOTH,
  indent: { firstLine: FL },
  spacing: { after: 60, line: 276 },
});

// Bold section label (Краткое резюме, Ключевые темы, Участники:, etc.)
const pLabel = (t: string) => new Paragraph({
  children: [R(t, true)],
  alignment: AlignmentType.LEFT,
  indent: { firstLine: FL },
  spacing: { before: 200, after: 80 },
});

// Vision-Scope top section: "1. Бизнес-требования" — bold both
const pTopSection = (t: string) => new Paragraph({
  children: [R(t, true)],
  alignment: AlignmentType.BOTH,
  indent: { firstLine: FL },
  spacing: { after: 60 },
});

// Numbered subheading (1.1., 2.3. etc.) — bold left, no firstLine
const pSub = (t: string) => new Paragraph({
  children: [R(t, true)],
  alignment: AlignmentType.LEFT,
  spacing: { before: 200, after: 80 },
});

// BRD heading: "N. Label:" bold + inline text normal
const pHeading = (t: string) => {
  const ci = t.indexOf(": ");
  const hasInline = ci !== -1 && t.length - ci > 12;
  return new Paragraph({
    children: hasInline ? [R(t.slice(0, ci + 1), true), R(t.slice(ci + 1))] : [R(t, true)],
    alignment: hasInline ? AlignmentType.BOTH : AlignmentType.LEFT,
    indent: hasInline ? undefined : { firstLine: FL },
    spacing: { before: 200, after: 80 },
  });
};

// Protocol topic "1. Тема" — bold, left, left indent
const pTopic = (t: string) => new Paragraph({
  children: [R(t, true)],
  alignment: AlignmentType.LEFT,
  indent: { left: FL },
  spacing: { before: 200, after: 80 },
});

// "Решили:" bold + text normal
const pResolved = (t: string) => {
  const ci = t.indexOf(": ");
  return new Paragraph({
    children: ci !== -1 ? [R(t.slice(0, ci + 1), true), R(t.slice(ci + 1))] : [R(t, true)],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: FL },
    spacing: { after: 60 },
  });
};

// Epic heading: "Эпик N: …" — 16pt bold both
const pEpic = (t: string) => new Paragraph({
  children: [R(t, true, false, SZ16)],
  alignment: AlignmentType.BOTH,
  indent: { firstLine: FL },
  spacing: { before: 200, after: 60 },
});

// US/UC heading — bold both
const pUCUS = (t: string) => new Paragraph({
  children: [R(t, true)],
  alignment: AlignmentType.BOTH,
  indent: { firstLine: FL },
  spacing: { before: 200, after: 60 },
});

// Italic field label + normal value: "Актор: Менеджер"
const pIField = (t: string) => {
  const ci = t.indexOf(": ");
  return new Paragraph({
    children: ci !== -1
      ? [R(t.slice(0, ci + 1), false, true), R(t.slice(ci + 1))]
      : [R(t, false, true)],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: FL },
    spacing: { after: 60 },
  });
};

// Italic-only label (Основной поток:, Критерии приёмки:, etc.)
const pILabel = (t: string) => new Paragraph({
  children: [R(t, false, true)],
  alignment: AlignmentType.BOTH,
  indent: { firstLine: FL },
  spacing: { after: 60 },
});

// Criteria list item — normal, no indent
const pCriteria = (t: string) => new Paragraph({
  children: [R(t)],
  alignment: AlignmentType.BOTH,
  spacing: { after: 60 },
});

// Section header for matrix/dependencies
const pSection = (t: string) => new Paragraph({
  children: [R(t, true)],
  alignment: AlignmentType.LEFT,
  indent: { firstLine: FL },
  spacing: { before: 200, after: 80 },
});

// Footer — no border
const pFooter = (t: string) => new Paragraph({
  children: [R(t)],
  alignment: AlignmentType.BOTH,
  indent: { firstLine: FL },
  spacing: { before: 400, after: 0 },
});

/* ─── Role detection ───────────────────────────────────────────────────────── */
type Role =
  | "title" | "meta" | "epic" | "uc_us_hdr" | "ifield" | "ilabel"
  | "criteria" | "resolved" | "topic" | "heading" | "sub" | "top_section"
  | "label" | "section" | "footer" | "body" | "empty";

const IFIELDS = [
  "Актор:", "Предусловия:", "Постусловия:", "Приоритет:", "Заметки:",
  "Психологические портреты участников:", "Рекомендации по взаимодействию:",
];
const ILABELS = [
  "Основной поток:", "Альтернативные потоки:", "Исключительные потоки:",
  "Бизнес-правила:", "Критерии приёмки:",
];
const LABELS = [
  "Участники:", "Цели встречи:", "Краткое содержание:", "Результаты встречи:",
  "Психологический контекст:", "Рекомендации для достижения целей:",
  "Краткое резюме", "Ключевые темы обсуждения", "Принятые решения",
  "Задачи и поручения", "Следующие шаги", "Зависимости:",
];
const TOP_SECTIONS = [
  /^1\.\s+Бизнес-требования/,
  /^2\.\s+Масштаб/,
  /^3\.\s+Бизнес-контекст/,
  /^Бизнес-требования$/,
  /^Масштаб и ограничения/,
  /^Бизнес-контекст$/,
];

function getRole(line: string, idx: number, lines: string[]): Role {
  const t = line.trim();
  if (!t) return "empty";
  const first = lines.findIndex(l => l.trim());
  if (idx === first) return "title";
  if (/^(Дата|Участники)\s*:/.test(t)) return "meta";
  if (/^Бизнес-аналитик/.test(t)) return "footer";
  if (/^Эпик\s+\d+/i.test(t)) return "epic";
  if (/^(UC|US)-\d+\s*:/i.test(t)) return "uc_us_hdr";
  if (IFIELDS.some(f => t.startsWith(f))) return "ifield";
  if (ILABELS.some(f => t.startsWith(f))) return "ilabel";
  if (/^Решили\s*:/i.test(t)) return "resolved";
  if (/^Матрица\s+(приоритетов|трассируемости)/i.test(t)) return "section";
  if (LABELS.some(h => t === h || t.startsWith(h))) return "label";
  if (TOP_SECTIONS.some(r => r.test(t))) return "top_section";
  if (/^\d+\.\d+\.\s/.test(t)) return "sub";          // 1.1. 2.3. etc
  if (/^\d+\.\s/.test(t) && lines.some(l => /^Решили:/i.test(l.trim()))) return "topic"; // protocol
  if (/^\d+\.\s/.test(t)) return "heading";            // BRD numbered
  // Criteria: line after an ilabel
  const prevNE = lines.slice(0, idx).filter(l => l.trim()).pop() ?? "";
  if (ILABELS.some(f => prevNE.startsWith(f))) return "criteria";
  return "body";
}

function makeP(line: string, role: Role): Paragraph {
  const t = line.trim();
  switch (role) {
    case "empty":       return pEmpty();
    case "title":       return pTitle(t);
    case "meta":        return pMeta(t);
    case "epic":        return pEpic(t);
    case "uc_us_hdr":   return pUCUS(t);
    case "ifield":      return pIField(t);
    case "ilabel":      return pILabel(t);
    case "criteria":    return pCriteria(t);
    case "resolved":    return pResolved(t);
    case "topic":       return pTopic(t);
    case "heading":     return pHeading(t);
    case "sub":         return pSub(t);
    case "top_section": return pTopSection(t);
    case "label":       return pLabel(t);
    case "section":     return pSection(t);
    case "footer":      return pFooter(t);
    default:            return pBody(t);
  }
}

/* ─── Public API ───────────────────────────────────────────────────────────── */
export function exportToTxt(text: string, fileName: string): void {
  saveAs(new Blob([text], { type: "text/plain;charset=utf-8" }), `${fileName}.txt`);
}

export async function exportToDocx(text: string, fileName: string): Promise<void> {
  const lines    = strip(text).split("\n");
  const children = lines.map((line, idx) => makeP(line, getRole(line, idx, lines)));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SZ, color: BLACK } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: {
            top:    convertInchesToTwip(1),
            right:  convertInchesToTwip(0.79),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.18),
          },
        },
      },
      children,
    }],
  });

  saveAs(await Packer.toBlob(doc), `${fileName}.docx`);
}
