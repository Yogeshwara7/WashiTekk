import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// Brand color and logo (optional)
const BRAND_COLOR = '#004643'; // Washitek brand color
const LOGO_URL = '/logo.png'; // Place your logo here or use a placeholder

// Helper to load image as base64
export function loadImageAsBase64(url, callback) {
  const img = new window.Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dataURL = canvas.toDataURL('image/png');
    callback(dataURL);
  };
  img.src = url;
}

export async function generateReceipt(payment, user, dashboard, signatureBase64, logoBase64) {
  const doc = new jsPDF();
  let y = 16;
  const receiptNo = payment?.referenceId || payment?.transactionId || payment?.date?.replace(/\W+/g, '').slice(-8) || Math.floor(Math.random()*1000000).toString();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header bar (taller, more prominent) ---
  doc.setFillColor('#004643');
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('Washitek', 105, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('www.washitek.com   |   support@washitek.com   |   +91-XXXXXXXXXX', 105, 20, { align: 'center' });
  y = 32;

  // Add 'PAID' badge (top right, above QR code)
  doc.saveGraphicsState();
  doc.setFillColor('#004643');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('PAID', 185, 30, { align: 'right', angle: 12 });
  doc.restoreGraphicsState();

  // --- RECEIPT title, number, date (only once) ---
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor('#222');
  doc.text('RECEIPT', 20, y);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Receipt #: ${receiptNo}`, 150, y);
  y += 6;
  doc.text(`Date: ${payment.date || new Date().toLocaleString()}`, 150, y);
  y += 10;

  // --- QR Code (right-aligned, below receipt info) and Billed To (left, same row) ---
  const qrUrl = `http://localhost:3000/verify?receipt=${receiptNo}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });
  const qrSize = 40;
  const qrX = pageWidth - 20 - qrSize;
  const qrY = y;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Billed To details (left, aligned with QR code)
  let billedY = qrY + 2; // small top margin
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#222');
  doc.text('Billed To:', 20, billedY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.text(`${user?.displayName || dashboard?.name || 'N/A'}`, 40, billedY);
  billedY += 6;
  doc.text(`${user?.email || dashboard?.email || 'N/A'}`, 40, billedY);
  billedY += 6;
  if (dashboard?.address) {
    const addr = dashboard.address;
    doc.text(`${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}, ${addr.country || ''}`.replace(/, +/g, ', ').replace(/^, |, $/g, ''), 40, billedY);
    billedY += 6;
  }
  let afterBilledY = Math.max(qrY + qrSize, billedY) + 8;

  // Divider after QR and Billed To
  doc.setDrawColor('#e8e4e6');
  doc.setLineWidth(0.5);
  doc.line(20, afterBilledY, 190, afterBilledY);
  y = afterBilledY + 2;

  // Payment Details
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#222');
  doc.text('Payment Details:', 20, y);
  y += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);

  // Table headers with background and border, and cell padding
  const tableX = 20;
  const tableY = y;
  const colWidths = [40, 40, 50, 40];
  const rowHeight = 11;
  // Header background
  doc.setFillColor('#e8e4e6');
  doc.rect(tableX, tableY, 170, rowHeight, 'F');
  // Header borders
  doc.setDrawColor('#bdbdbd');
  doc.setLineWidth(0.3);
  let colX = tableX;
  for (let i = 0; i < colWidths.length; i++) {
    doc.line(colX, tableY, colX, tableY + rowHeight * (Array.isArray(payment.items) ? payment.items.length + 1 : 2));
    colX += colWidths[i];
  }
  doc.line(tableX, tableY, tableX + 170, tableY); // top
  doc.line(tableX, tableY + rowHeight, tableX + 170, tableY + rowHeight); // between header and row
  // Draw row separators
  const numRows = Array.isArray(payment.items) ? payment.items.length : 1;
  for (let i = 1; i <= numRows; i++) {
    // Alternate row background
    if (i % 2 === 1 && numRows > 1) {
      doc.setFillColor('#f6f6f6');
      doc.rect(tableX, tableY + rowHeight * i, 170, rowHeight, 'F');
    }
    doc.line(tableX, tableY + rowHeight * (i + 1), tableX + 170, tableY + rowHeight * (i + 1));
  }
  doc.line(tableX + 170, tableY, tableX + 170, tableY + rowHeight * (numRows + 1)); // right

  // Header text
  doc.setTextColor('#000000');
  doc.setFont(undefined, 'bold');
  doc.text('Plan', tableX + 6, tableY + 8);
  doc.text('Duration', tableX + colWidths[0] + 6, tableY + 8);
  doc.text('Amount Paid', tableX + colWidths[0] + colWidths[1] + 6, tableY + 8);
  doc.text('Status', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 6, tableY + 8);

  // Table values rows
  doc.setFont(undefined, 'normal');
  doc.setTextColor('#222');
  if (Array.isArray(payment.items)) {
    payment.items.forEach((item, idx) => {
      const valueY = tableY + rowHeight * (idx + 1) + 8;
      doc.text(`${item.plan || item.name || ''}`, tableX + 6, valueY);
      doc.text(`${item.duration || ''}`, tableX + colWidths[0] + 6, valueY);
      doc.setFont(undefined, 'bold');
      doc.text(`Rs. ${item.amount || item.price || ''}`, tableX + colWidths[0] + colWidths[1] + 6, valueY);
      doc.setFont(undefined, 'normal');
      doc.text(`${item.status || payment.status || 'Success'}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 6, valueY);
    });
    y = tableY + rowHeight * (payment.items.length + 1) + 4;
  } else {
    const valueY = tableY + rowHeight + 8;
    // Fallbacks for no-plan users
    const planValue = payment.plan || dashboard?.planName || 'One-time Service';
    const durationValue = dashboard?.planDuration || 'N/A';
    doc.text(`${planValue}`, tableX + 6, valueY);
    doc.text(`${durationValue}`, tableX + colWidths[0] + 6, valueY);
    doc.setFont(undefined, 'bold');
    doc.text(`Rs. ${payment.amount || payment.price || dashboard?.planPrice || ''}`, tableX + colWidths[0] + colWidths[1] + 6, valueY);
    doc.setFont(undefined, 'normal');
    doc.text(`${payment.status || 'Success'}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 6, valueY);
    y = tableY + rowHeight * 2 + 4;
  }

  // Transaction details
  if (payment.method) {
    doc.text(`Payment Method: ${payment.method}`, 24, y);
    y += 7;
  }
  if (payment.referenceId || payment.transactionId) {
    doc.text(`Transaction ID: ${payment.referenceId || payment.transactionId}`, 24, y);
    y += 7;
  }
  y += 2;

  // Divider
  doc.setDrawColor('#e8e4e6');
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 10;

  // Thank you note and footer
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#222');
  doc.text('Thank you for your payment and trust in Washitek!', 20, y);
  y += 7;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text('This is a system-generated receipt. For queries, contact support@washitek.com', 20, y);
  y += 16;

  // --- Signature section (centered, with faint line) ---
  let signatureSectionY = y;
  const sigLineWidth = 60;
  const sigLineX = pageWidth / 2 - sigLineWidth / 2;
  doc.setDrawColor('#bdbdbd');
  doc.setLineWidth(0.7);
  doc.line(sigLineX, signatureSectionY + 18, sigLineX + sigLineWidth, signatureSectionY + 18);
  if (signatureBase64) {
    const imgWidth = 40;
    const imgHeight = 16;
    const imgX = pageWidth / 2 - imgWidth / 2;
    doc.addImage(signatureBase64, 'PNG', imgX, signatureSectionY, imgWidth, imgHeight);
    signatureSectionY += imgHeight + 6;
  } else {
    signatureSectionY += 18;
  }
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor('#222');
  doc.text('Received By: Authorized Signatory', pageWidth / 2, signatureSectionY + 10, { align: 'center' });

  // --- Divider above footer bar ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor('#e8e4e6');
  doc.setLineWidth(0.7);
  doc.line(0, pageHeight - 16, 210, pageHeight - 16);

  // --- Footer bar (bottom of page) ---
  const footerHeight = 14;
  doc.setFillColor('#004643');
  doc.rect(0, pageHeight - footerHeight, 210, footerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Washitek Technologies Pvt. Ltd.  |  www.washitek.com  |  support@washitek.com', 105, pageHeight - 7, { align: 'center' });
  doc.setFontSize(7);
  doc.text('This receipt is computer generated and does not require a physical signature.', 105, pageHeight - 2.5, { align: 'center' });

  doc.save(`receipt_${receiptNo}.pdf`);
} 