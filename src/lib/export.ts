import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export function exportToTxt(text: string, fileName: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${fileName}.txt`);
}

export async function exportToDocx(text: string, fileName: string) {
  const lines = text.split("\n");
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fileName,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
      spacing: { after: 400 },
    })
  );

  for (const line of lines) {
    if (line.trim() === "") {
      children.push(new Paragraph({ spacing: { after: 100 } }));
    } else {
      const isSpeaker = /^Участник\s*\d+/i.test(line.trim());
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: isSpeaker,
              size: 24,
            }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `${fileName}.docx`);
}
