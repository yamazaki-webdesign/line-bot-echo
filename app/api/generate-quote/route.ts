import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const { customerName, workDescription, amount } = await request.json();

  if (!customerName || !workDescription || !amount) {
    return NextResponse.json(
      { error: "customerName, workDescription, amount は必須です" },
      { status: 400 }
    );
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontPath = path.join(
    process.cwd(),
    "assets/fonts/NotoSansJP-Regular.ttf"
  );
  const fontBytes = await readFile(fontPath);
  // NOTE: pdf-lib's automatic glyph subsetting corrupts this font's glyph
  // mapping (kanji render as wrong/blank glyphs), so the full font is
  // embedded instead of a subset.
  const font = await pdfDoc.embedFont(fontBytes, { subset: false });

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  const issueDate = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amountNumber = Number(amount);
  const formattedAmount = Number.isFinite(amountNumber)
    ? `¥${amountNumber.toLocaleString("ja-JP")}`
    : String(amount);

  // Title
  page.drawText("御見積書", {
    x: width / 2 - font.widthOfTextAtSize("御見積書", 28) / 2,
    y: height - 100,
    size: 28,
    font,
    color: black,
  });

  // Issue date (top right)
  page.drawText(`発行日: ${issueDate}`, {
    x: width - 60 - font.widthOfTextAtSize(`発行日: ${issueDate}`, 11),
    y: height - 150,
    size: 11,
    font,
    color: gray,
  });

  // Company name (top right, under date)
  page.drawText("サンプルリフォーム", {
    x: width - 60 - font.widthOfTextAtSize("サンプルリフォーム", 12),
    y: height - 170,
    size: 12,
    font,
    color: black,
  });

  // Customer name (large, under title, left aligned)
  page.drawText(`${customerName} 様`, {
    x: 60,
    y: height - 170,
    size: 16,
    font,
    color: black,
  });

  page.drawLine({
    start: { x: 60, y: height - 185 },
    end: { x: width - 60, y: height - 185 },
    thickness: 1,
    color: gray,
  });

  // Detail table
  const labelX = 60;
  const valueX = 180;
  const valueSize = 14;
  const lineGap = 20;
  const rowPadding = 16;
  const maxValueWidth = width - 60 - valueX;

  function wrapText(text: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of String(text).split("\n")) {
      let currentLine = "";
      for (const char of paragraph) {
        const candidate = currentLine + char;
        if (
          currentLine !== "" &&
          font.widthOfTextAtSize(candidate, size) > maxWidth
        ) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = candidate;
        }
      }
      lines.push(currentLine);
    }
    return lines;
  }

  const rows: { label: string; lines: string[] }[] = [
    {
      label: "工事内容",
      lines: wrapText(workDescription, valueSize, maxValueWidth),
    },
    { label: "金額", lines: wrapText(formattedAmount, valueSize, maxValueWidth) },
  ];

  const rowHeights = rows.map(
    (row) => rowPadding * 2 + row.lines.length * lineGap
  );
  const tableHeight = rowHeights.reduce((a, b) => a + b, 0);
  const tableTop = height - 240;

  page.drawRectangle({
    x: 60,
    y: tableTop - tableHeight,
    width: width - 120,
    height: tableHeight,
    borderColor: gray,
    borderWidth: 1,
  });

  let rowTop = tableTop;
  rows.forEach((row, index) => {
    if (index > 0) {
      page.drawLine({
        start: { x: 60, y: rowTop },
        end: { x: width - 60, y: rowTop },
        thickness: 0.5,
        color: gray,
      });
    }

    page.drawText(row.label, {
      x: labelX + 15,
      y: rowTop - rowPadding - 10,
      size: 12,
      font,
      color: gray,
    });

    row.lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: valueX,
        y: rowTop - rowPadding - 10 - lineIndex * lineGap,
        size: valueSize,
        font,
        color: black,
      });
    });

    rowTop -= rowHeights[index];
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote_${Date.now()}.pdf"`,
    },
  });
}
