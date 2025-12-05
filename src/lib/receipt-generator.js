import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

/**
 * Generate a receipt PDF for a single transaction
 * @param {Object} transaction - Transaction data
 * @returns {jsPDF} PDF document
 */
export function generateTransactionReceipt(transaction) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;

  // Company Header with Red Background
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("FUTURA HOMES", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Property Management & Sales", pageWidth / 2, 30, {
    align: "center",
  });
  doc.text("Official Payment Receipt", pageWidth / 2, 38, {
    align: "center",
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Receipt Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", pageWidth / 2, 58, { align: "center" });

  // Transaction Information Box
  let yPos = 75;

  // Draw background for transaction info
  doc.setFillColor(248, 250, 252);
  doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 49, "F");

  // Transaction details in two columns
  doc.setFontSize(9);
  const leftColX = leftMargin + 5;
  const leftColValueX = leftMargin + 50;
  const rightColX = 115;
  const rightColValueX = 155;

  yPos += 5;

  // Left Column
  doc.setFont("helvetica", "bold");
  doc.text("Transaction ID:", leftColX, yPos);
  doc.setFont("helvetica", "normal");
  // Split long transaction ID into multiple lines if needed
  const transId = transaction.transaction_id?.toString() || "N/A";
  if (transId.length > 25) {
    const splitId = doc.splitTextToSize(transId, 55);
    doc.text(splitId, leftColValueX, yPos);
  } else {
    doc.text(transId, leftColValueX, yPos);
  }

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Transaction Date:", leftColX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    transaction.transaction_date
      ? format(new Date(transaction.transaction_date), "MMM dd, yyyy")
      : "N/A",
    leftColValueX,
    yPos
  );

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Contract ID:", leftColX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(transaction.contract_id?.toString() || "N/A", leftColValueX, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Contract Number:", leftColX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    transaction.property_contracts?.contract_number || "N/A",
    leftColValueX,
    yPos
  );

  // Right Column
  yPos = 80;
  doc.setFont("helvetica", "bold");
  doc.text("Payment Status:", rightColX, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 128, 0);
  doc.text(
    (transaction.payment_status || "N/A").toUpperCase(),
    rightColValueX,
    yPos
  );
  doc.setTextColor(0, 0, 0);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method:", rightColX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    (transaction.payment_method || "N/A").toUpperCase(),
    rightColValueX,
    yPos
  );

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Reference Number:", rightColX, yPos);
  doc.setFont("helvetica", "normal");
  const refNum = transaction.reference_number || "N/A";
  doc.text(refNum, rightColValueX, yPos);

  // Client Information Section
  yPos += 23;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text("CLIENT INFORMATION", leftMargin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 38, 38);
  doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

  yPos += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Name:", leftMargin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    transaction.property_contracts?.client_name || "N/A",
    leftMargin + 30,
    yPos
  );

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Phone:", leftMargin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    transaction.property_contracts?.client_phone || "N/A",
    leftMargin + 30,
    yPos
  );

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Email:", leftMargin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    transaction.property_contracts?.client_email || "N/A",
    leftMargin + 30,
    yPos
  );

  // Payment Details Section
  yPos += 18;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text("PAYMENT DETAILS", leftMargin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 38, 38);
  doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

  yPos += 10;

  // Payment breakdown table
  const paymentData = [
    [
      "Principal Amount",
      `₱ ${parseFloat(transaction.amount_paid || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ],
    [
      "Penalty Charges",
      `₱ ${parseFloat(transaction.penalty_paid || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: paymentData,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        cellWidth: 120,
        halign: "left",
      },
      1: {
        halign: "right",
        cellWidth: 50,
        fontStyle: "normal",
      },
    },
    margin: { left: leftMargin, right: leftMargin },
  });

  // Total Amount (highlighted)
  yPos = doc.lastAutoTable.finalY + 2;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        "TOTAL AMOUNT PAID",
        `₱ ${parseFloat(transaction.total_amount || 0).toLocaleString(
          "en-PH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`,
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 12,
      cellPadding: 7,
      fontStyle: "bold",
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 120, halign: "left" },
      1: { cellWidth: 50, halign: "right" },
    },
    margin: { left: leftMargin, right: leftMargin },
  });

  // Notes Section (if available)
  if (transaction.notes) {
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("NOTES", leftMargin, yPos);
    doc.setTextColor(0, 0, 0);

    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 38, 38);
    doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(transaction.notes, 170);
    doc.text(splitNotes, leftMargin, yPos);
  }

  // Footer
  const footerY = pageHeight - 25;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, footerY - 5, rightMargin, footerY - 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This is a computer-generated receipt and does not require a signature.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}`,
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "For inquiries, please contact Futura Homes customer service.",
    pageWidth / 2,
    footerY + 10,
    { align: "center" }
  );

  return doc;
}

/**
 * Generate a summary receipt PDF for multiple transactions within a date range
 * @param {Array} transactions - Array of transaction data
 * @param {String} startDate - Start date for the range
 * @param {String} endDate - End date for the range
 * @returns {jsPDF} PDF document
 */
export function generateDateRangeReceipt(transactions, startDate, endDate) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 15;
  const rightMargin = pageWidth - 15;

  // Company Header
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("FUTURA HOMES", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Property Management & Sales", pageWidth / 2, 30, {
    align: "center",
  });
  doc.text("Transaction Summary Report", pageWidth / 2, 38, {
    align: "center",
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Report Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TRANSACTION SUMMARY", pageWidth / 2, 58, { align: "center" });

  // Date Range
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const dateRangeText = `Report Period: ${
    startDate ? format(new Date(startDate), "MMM dd, yyyy") : "Beginning"
  } to ${endDate ? format(new Date(endDate), "MMM dd, yyyy") : "Present"}`;
  doc.text(dateRangeText, pageWidth / 2, 68, { align: "center" });

  // Summary Statistics
  const totalAmount = transactions.reduce(
    (sum, t) => sum + parseFloat(t.total_amount || 0),
    0
  );
  const totalPenalties = transactions.reduce(
    (sum, t) => sum + parseFloat(t.penalty_paid || 0),
    0
  );
  const totalPrincipal = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount_paid || 0),
    0
  );
  const completedCount = transactions.filter(
    (t) => t.payment_status === "completed"
  ).length;

  let yPos = 82;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text("SUMMARY STATISTICS", leftMargin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 38, 38);
  doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

  yPos += 10;

  // Statistics table
  const statsData = [
    ["Total Transactions:", transactions.length.toString()],
    ["Completed Transactions:", completedCount.toString()],
    [
      "Total Principal Amount:",
      `₱${totalPrincipal.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ],
    [
      "Total Penalties:",
      `₱${totalPenalties.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: statsData,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        cellWidth: 120,
        halign: "left",
      },
      1: {
        cellWidth: 65,
        halign: "right",
      },
    },
    margin: { left: leftMargin },
  });

  // Total highlighted
  yPos = doc.lastAutoTable.finalY + 2;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [
        "TOTAL AMOUNT COLLECTED:",
        `₱${totalAmount.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 11,
      cellPadding: 5,
      fontStyle: "bold",
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 120, halign: "left" },
      1: { cellWidth: 65, halign: "right" },
    },
    margin: { left: leftMargin },
  });

  // Transactions Table
  yPos = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text("TRANSACTION DETAILS", leftMargin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 38, 38);
  doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

  yPos += 8;

  // Prepare table data
  const tableData = transactions.map((t) => [
    t.transaction_id?.toString().substring(0, 8) + "..." || "N/A",
    format(new Date(t.transaction_date), "MM/dd/yyyy"),
    t.property_contracts?.client_name || "N/A",
    t.reference_number || "N/A",
    `₱${parseFloat(t.total_amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    })}`,
    (t.payment_status || "N/A").toUpperCase(),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Trans. ID", "Date", "Client Name", "Ref. Number", "Amount", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "left" },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 42, halign: "left" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 24, halign: "center", fontStyle: "bold" },
    },
    margin: { left: leftMargin, right: leftMargin },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer
  const footerY = pageHeight - 25;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, footerY - 5, rightMargin, footerY - 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This is a computer-generated report and does not require a signature.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}`,
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "For inquiries, please contact Futura Homes customer service.",
    pageWidth / 2,
    footerY + 10,
    { align: "center" }
  );

  return doc;
}
