import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generate high-definition print-ready A4 PDF from the invoice element
 */
export async function downloadInvoicePDF(elementId, filename = 'Tax_Invoice.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Invoice element not found');
  }

  // Temporary styling adjustments for crisp capture
  const originalWidth = element.style.width;
  element.style.width = '794px'; // standard 96dpi A4 pixel width

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5, // High DPI capture for crisp text & borders
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Fit to single A4 page with small margin
    const margin = 5;
    const renderWidth = pdfWidth - (margin * 2);
    const renderHeight = (canvas.height * renderWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, renderWidth, Math.min(renderHeight, pdfHeight - (margin * 2)));
    pdf.save(filename);
    return true;
  } finally {
    element.style.width = originalWidth;
  }
}
