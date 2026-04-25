/**
 * Export utilities for Scribe_ artifacts.
 *
 * Two formatting profiles derived from approved samples:
 *
 * PROTOCOL (образец.docx):
 *   Title        16pt Bold  left  firstLine=709  spA=80
 *   Date/Meta    14pt Bold  left  firstLine=709  spA=200
 *   Section hdr  14pt Bold  both  firstLine=709  spA=60
 *   Topic "N."   14pt Bold  left  left=709       spB=200 spA=80
 *   "Решили:"    14pt Bold  both  firstLine=709  spA=60
 *   Body         14pt Norm  both  firstLine=709  spA=60
 *   Footer       14pt Norm  both  firstLine=709  spA=0
 *
 * BRD & OTHERS (Образец_БРД.docx):
 *   Title        16pt Bold  left  firstLine=0    spA=80
 *   Date         14pt Bold  left  firstLine=0    spA=200
 *   Section "N." 14pt Bold  left  firstLine=0    spB=200 spA=80
 *   Body         14pt Norm  both  firstLine=709  spA=60
 *   Footer       14pt Norm  both  firstLine=709  spA=0
 */
import {
  Document, Paragraph, TextRun, Packer,
  AlignmentType, convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

const FONT       = "Times New Roman";
const SZ_TITLE   = 32;  // 16pt (half-points)
const SZ_BODY    = 28;  // 14pt
const BLACK      = "000000";
const INDENT_709 = 709; // ≈1.25cm in twips

type Profile = "protocol" | "default";

type Role =
  | "title"
  | "date"
  | "section_numbered"
  | "section_plain"
  | "section_label"
  | "uc_heading"
  | "uc_field"
  | "us_heading"        // "US-001: Название" — bold, both, firstLine=709
  | "epic_heading"      // "Эпик 1: Название" — 16pt bold, both, firstLine=709
  | "us_field"          // "Приоритет:", "Критерии приёмки:", "Заметки:" — italic
  | "us_criteria"       // list items under "Критерии приёмки:" — normal, firstLine=0
  | "us_section"        // "Матрица приоритетов", "Зависимости:" — bold
  | "topic"
  | "resolved"
  | "body"
  | "footer"
  | "empty";

function detectProfile(lines: string[]): Profile {
  // If any line starts with "Решили:" → protocol format
  if (lines.some(l => /^Решили:/i.test(l.trim()))) return "protocol";
  return "default";
}

function getRole(line: string, idx: number, lines: string[], profile: Profile): Role {
  const t = line.trim();
  if (!t) return "empty";

  const first = lines.findIndex(l => l.trim());
  if (idx === first) return "title";

  if (t.startsWith("Дата:") || t.startsWith("Участники:")) return "date";
  if (t.startsWith("Бизнес-аналитик")) return "footer";

  // Numbered heading: "1. Text" / "1.2. Text"
  if (/^\d+[\d.]*\.\s/.test(t)) {
    return profile === "protocol" ? "topic" : "section_numbered";
  }

  if (/^Решили:/i.test(t)) return "resolved";

  const PLAIN_SECTIONS = [
    // Protocol
    "Краткое резюме", "Ключевые темы обсуждения",
    "Принятые решения", "Задачи и поручения", "Следующие шаги",
    // Vision-Scope top-level
    "Бизнес-требования", "Масштаб и ограничения проекта", "Бизнес-контекст",
  ];
  if (PLAIN_SECTIONS.some(h => t === h || t.startsWith(h + " "))) return "section_plain";

  // Epic heading "Эпик N: Название" — 16pt Bold, both, firstLine=709
  if (/^Эпик\s+\d+:/i.test(t)) return "epic_heading";

  // "Матрица приоритетов", "Зависимости:" — bold section
  if (/^Матрица\s+приоритетов/i.test(t) || t === "Зависимости:") return "us_section";

  // US field labels: Приоритет:, Критерии приёмки:, Заметки: — italic
  const US_FIELDS = ["Приоритет:", "Критерии приёмки:", "Заметки:"];
  if (US_FIELDS.some(f => t.startsWith(f))) return "us_field";

  // Criteria list items (under "Критерии приёмки:") — Normal, both, firstLine=0
  // Detect by context: lines after Критерии приёмки that start with dash or are short items
  // We'll detect them as "us_criteria" if preceded by criteria header
  // Simple heuristic: lines starting with "-" or "Возможность"
  if (t.startsWith("- ") || t.startsWith("Возможность")) return "us_criteria";

  // US-XXX: heading (User Stories)
  if (/^US-\d+:/i.test(t)) return "us_heading";

  // Use Cases italic field labels
  const UC_FIELDS = [
    "Актор:", "Предусловия:", "Постусловия:",
    "Основной поток:", "Альтернативные потоки:",
    "Исключительные потоки:", "Бизнес-правила:", "Приоритет:",
  ];
  if (UC_FIELDS.some(f => t.startsWith(f))) return "uc_field";
  // Also catch known labels explicitly
  const LABEL_SECTIONS = [
    "Участники:", "Цели встречи:", "Краткое содержание:",
    "Результаты встречи:", "Психологический контекст:",
    "Психологические портреты участников:", "Рекомендации по взаимодействию:",
    "Рекомендации для достижения целей:",
  ];
  if (LABEL_SECTIONS.some(h => t === h || t.startsWith(h))) return "section_label";

  return "body";
}

function run(text: string, bold: boolean, sz = SZ_BODY): TextRun {
  return new TextRun({ text, font: FONT, size: sz, bold, color: BLACK });
}

function makeParagraph(line: string, role: Role, profile: Profile): Paragraph {
  const t = line.trim();

  if (role === "empty") return new Paragraph({
    children: [run("", false)],
    spacing: { after: 60 },
  });

  if (role === "title") return new Paragraph({
    children: [run(t, true, SZ_TITLE)],
    alignment: AlignmentType.LEFT,
    indent: profile === "protocol" ? { firstLine: INDENT_709 } : {},
    spacing: { after: 80 },
  });

  if (role === "date") return new Paragraph({
    children: [run(t, true)],
    alignment: AlignmentType.LEFT,
    indent: profile === "protocol" ? { firstLine: INDENT_709 } : {},
    spacing: { after: 200 },
  });

  // Эпик N: Название — 16pt Bold, both, firstLine=709
  if (role === "epic_heading") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SZ_TITLE, bold: true, color: BLACK })],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { before: 200, after: 60 },
  });

  // US-001: Название — Bold, both, firstLine=709
  if (role === "us_heading") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SZ_BODY, bold: true, color: BLACK })],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { before: 200, after: 60 },
  });

  // Приоритет:, Критерии приёмки:, Заметки: — italic label + normal value
  if (role === "us_field") {
    const colonIdx = t.indexOf(": ");
    if (colonIdx !== -1) {
      const label = t.slice(0, colonIdx + 1);
      const value = t.slice(colonIdx + 1);
      return new Paragraph({
        children: [
          new TextRun({ text: label, font: FONT, size: SZ_BODY, italics: true, color: BLACK }),
          new TextRun({ text: value, font: FONT, size: SZ_BODY, italics: false, color: BLACK }),
        ],
        alignment: AlignmentType.BOTH,
        indent: { firstLine: INDENT_709 },
        spacing: { after: 60 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: t, font: FONT, size: SZ_BODY, italics: true, color: BLACK })],
      alignment: AlignmentType.BOTH,
      indent: { firstLine: INDENT_709 },
      spacing: { after: 60 },
    });
  }

  // Criteria list items — Normal, both, firstLine=0 (no indent per sample)
  if (role === "us_criteria") return new Paragraph({
    children: [new TextRun({ text: t.replace(/^-\s*/, ""), font: FONT, size: SZ_BODY, color: BLACK })],
    alignment: AlignmentType.BOTH,
    spacing: { after: 60 },
  });

  // Матрица приоритетов / Зависимости: — Bold, both, firstLine=709
  if (role === "us_section") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SZ_TITLE, bold: true, color: BLACK })],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { before: 200, after: 60 },
  });

  // UC-001: Название — Bold, both, firstLine=709
  if (role === "uc_heading") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SZ_BODY, bold: true, color: BLACK })],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { before: 200, after: 60 },
  });

  // Актор:, Предусловия:, etc — Italic, both, firstLine=709
  if (role === "uc_field") {
    const colonIdx = t.indexOf(": ");
    if (colonIdx !== -1) {
      const label = t.slice(0, colonIdx + 1);
      const value = t.slice(colonIdx + 1);
      return new Paragraph({
        children: [
          new TextRun({ text: label, font: FONT, size: SZ_BODY, italics: true, color: BLACK }),
          new TextRun({ text: value, font: FONT, size: SZ_BODY, italics: false, color: BLACK }),
        ],
        alignment: AlignmentType.BOTH,
        indent: { firstLine: INDENT_709 },
        spacing: { after: 60 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: t, font: FONT, size: SZ_BODY, italics: true, color: BLACK })],
      alignment: AlignmentType.BOTH,
      indent: { firstLine: INDENT_709 },
      spacing: { after: 60 },
    });
  }

  // Meeting-summary labeled section "Участники:", "Цели встречи:" etc.
  // Bold, left, no indent, spBefore=200, spAfter=80
  if (role === "section_label") return new Paragraph({
    children: [run(t, true)],
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 80 },
  });

  // Top-level section header ("Бизнес-требования", "Краткое резюме", etc.)
  // VS sample: bold, both, firstLine=0, spA=60
  // Protocol sample: bold, both, firstLine=709, spA=60
  if (role === "section_plain") return new Paragraph({
    children: [run(t, true)],
    alignment: AlignmentType.BOTH,
    indent: profile === "protocol" ? { firstLine: INDENT_709 } : {},
    spacing: { after: 60 },
  });

  // Protocol topic "1. Тема" — left hanging indent
  if (role === "topic") return new Paragraph({
    children: [run(t, true)],
    alignment: AlignmentType.LEFT,
    indent: { left: INDENT_709 },
    spacing: { before: 200, after: 80 },
  });

  // BRD/VS numbered section heading
  // BRD: "1. Название: текст" → bold label + normal text
  // VS:  "1.1. Подраздел" → entire line bold
  if (role === "section_numbered") {
    const colonIdx = t.indexOf(": ");
    // Only split on colon if it's a BRD-style "N. Label: inline text" pattern
    // VS subheadings like "1.1. Предпосылки (Background)" have no inline text after colon
    const hasInlineText = colonIdx !== -1 && t.length - colonIdx > 10;
    if (hasInlineText) {
      const label = t.slice(0, colonIdx + 1);
      const body  = t.slice(colonIdx + 1);
      return new Paragraph({
        children: [run(label, true), run(body, false)],
        alignment: AlignmentType.BOTH,
        spacing: { before: 200, after: 80 },
      });
    }
    return new Paragraph({
      children: [run(t, true)],
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 80 },
    });
  }

  // Protocol "Решили:"
  if (role === "resolved") return new Paragraph({
    children: [run(t, true)],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { after: 60 },
  });

  if (role === "footer") return new Paragraph({
    children: [run(t, false)],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { before: 400, after: 0 },
    border: { top: { color: "CCCCCC", space: 4, style: "single", size: 4 } },
  });

  // Body — justified, firstLine indent
  return new Paragraph({
    children: [run(t, false)],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT_709 },
    spacing: { after: 60, line: 276 },
  });
}

export function exportToTxt(text: string, fileName: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${fileName}.txt`);
}

export async function exportToDocx(text: string, fileName: string) {
  const lines   = text.split("\n");
  const profile = detectProfile(lines);

  const children = lines.map((line, idx) =>
    makeParagraph(line, getRole(line, idx, lines, profile), profile)
  );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: SZ_BODY, color: BLACK } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
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

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `${fileName}.docx`);
}
