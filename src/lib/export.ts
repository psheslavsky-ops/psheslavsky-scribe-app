import {
  Document, Paragraph, TextRun, Packer,
  AlignmentType, convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

const FONT       = "Times New Roman";
const SIZE_BODY  = 28;   // 14pt (docx = half-points)
const SIZE_TITLE = 32;   // 16pt
const SIZE_HEAD  = 28;   // 14pt bold
const SIZE_DATE  = 28;   // 14pt
const INDENT     = 709;  // ~1.25cm first-line indent in twips
const BLACK      = "000000";

type Role = "title" | "date" | "heading" | "footer" | "empty" | "body";

function lineRole(line: string, idx: number, lines: string[]): Role {
  const t = line.trim();
  if (!t) return "empty";
  const first = lines.findIndex(l => l.trim());
  if (idx === first) return "title";
  if (t.startsWith("Дата:")) return "date";
  if (t.startsWith("Бизнес-аналитик")) return "footer";
  if (/^\d+\./.test(t)) return "heading";
  return "body";
}

function makeParagraph(line: string, role: Role): Paragraph {
  const t = line.trim();

  if (role === "empty") return new Paragraph({
    children: [new TextRun({ text: "", font: FONT, size: SIZE_BODY })],
    spacing: { after: 60 },
  });

  if (role === "title") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SIZE_TITLE, bold: true, color: BLACK })],
    alignment: AlignmentType.LEFT,
    spacing: { after: 80 },
  });

  if (role === "date") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SIZE_DATE, color: BLACK })],
    alignment: AlignmentType.LEFT,
    spacing: { after: 200 },
  });

  if (role === "heading") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SIZE_HEAD, bold: true, color: BLACK })],
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 80 },
  });

  if (role === "footer") return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SIZE_BODY, bold: true, color: BLACK })],
    alignment: AlignmentType.LEFT,
    spacing: { before: 400, after: 0 },
    border: { top: { color: "CCCCCC", space: 4, style: "single", size: 4 } },
  });

  // body — justified + first-line indent
  return new Paragraph({
    children: [new TextRun({ text: t, font: FONT, size: SIZE_BODY, color: BLACK })],
    alignment: AlignmentType.BOTH,
    indent: { firstLine: INDENT },
    spacing: { after: 60, line: 276 },
  });
}

export function exportToTxt(text: string, fileName: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${fileName}.txt`);
}

export async function exportToDocx(text: string, fileName: string) {
  const lines = text.split("\n");
  const children = lines.map((line, idx) =>
    makeParagraph(line, lineRole(line, idx, lines))
  );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: SIZE_BODY } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            right:  convertInchesToTwip(0.75),
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
