// Small helper to build a PDF from one or more tables and trigger a browser
// download. Used by the Reports page so every "download" in the app produces
// a PDF file, and by the Help page for the downloadable user manual.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_COLOR: [number, number, number] = [59, 91, 219]; // #3B5BDB

export interface PdfSection {
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PdfOptions {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
}

export function buildPdf({ title, subtitle, sections }: PdfOptions): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedOn = new Date().toLocaleString("en-IN");

  // Header band
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("DukaanMitra", 14, 12);
  doc.setFontSize(11);
  doc.text(title, 14, 21);

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(`Generated ${generatedOn}`, pageWidth - 14, 8, { align: "right" });

  let cursorY = 36;
  if (subtitle) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.text(subtitle, 14, cursorY);
    cursorY += 8;
  }

  sections.forEach((section) => {
    if (section.heading) {
      doc.setTextColor(30, 42, 59);
      doc.setFontSize(12);
      doc.text(section.heading, 14, cursorY);
      cursorY += 4;
    }
    autoTable(doc, {
      startY: cursorY,
      head: [section.columns],
      body: section.rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      margin: { left: 14, right: 14 },
    });
    // @ts-ignore - lastAutoTable is attached by the autoTable plugin
    cursorY = (doc as any).lastAutoTable.finalY + 12;
  });

  return doc;
}

export function downloadPdf(filename: string, options: PdfOptions) {
  const doc = buildPdf(options);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
