// lib/pdf.js
import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Shared helper to generate a PDF from tabular data.
 * Displays a title, generated timestamp, and formatted table.
 *
 * @param {string[]} headers — Array of column header titles
 * @param {any[][]} rows — Array of rows, where each row is an array of column cell values
 * @param {string} title — Report title
 * @param {string} [subtitle] — Optional subtitle (e.g. depot name)
 */
export function generatePdfFromTable(headers, rows, title, subtitle = "") {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header Styling ──
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Subtitle / Depot name
  let nextY = 26;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(subtitle, 14, nextY);
    nextY += 6;
  }

  // Generated timestamp
  const timestamp = `Generated on: ${new Date().toLocaleString("en-IN")}`;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(timestamp, 14, nextY);
  nextY += 8;

  // Horizontal divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(14, nextY, pageWidth - 14, nextY);
  nextY += 8;

  // ── Table Generation ──
  doc.autoTable({
    startY: nextY,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [24, 24, 24],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 14, right: 14 },
    styles: {
      font: "helvetica",
      lineWidth: 0.1,
      strokeColor: [230, 230, 230],
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${data.pageNumber}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(str, pageWidth - 14 - doc.getTextWidth(str), doc.internal.pageSize.getHeight() - 10);
    },
  });

  // Save the generated document
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_report.pdf`;
  doc.save(fileName);
}
