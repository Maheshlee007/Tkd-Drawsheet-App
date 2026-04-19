import jsPDF from 'jspdf';

export interface CoachCardData {
  coachCode: string;
  coachName: string;
  tournamentCode: string;
  tournamentName: string;
  beltRank?: string;
  experienceYears?: number;
  photoUrl?: string;
  qrDataUrl?: string | null;
}

export function buildCoachQrPayload(data: CoachCardData): string {
  return [
    `Coach: ${data.coachName}`,
    `Coach ID: ${data.coachCode}`,
    `Belt: ${data.beltRank || 'N/A'}`,
    `Experience: ${typeof data.experienceYears === 'number' ? `${data.experienceYears} years` : 'N/A'}`,
    `Tournament: ${data.tournamentCode} (${data.tournamentName})`,
  ].join('\n');
}

function buildCoachCardPdfDoc(data: CoachCardData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cardWidth = 122;
  const cardHeight = 78;
  const gap = 14;
  const startX = (pageWidth - (cardWidth * 2 + gap)) / 2;
  const startY = (pageHeight - cardHeight) / 2;

  const frontX = startX;
  const backX = startX + cardWidth + gap;

  // Front card shell
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.roundedRect(frontX, startY, cardWidth, cardHeight, 3, 3, 'S');
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(frontX, startY, cardWidth, 13, 3, 3, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(frontX, startY + 11, cardWidth, 2, 'F');

  // Header and tournament branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OFFICIAL COACH ID CARD', frontX + cardWidth / 2, startY + 5.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(data.tournamentName.toUpperCase(), frontX + cardWidth / 2, startY + 9.5, { align: 'center' });

  // Photo area (large)
  const photoX = frontX + 7;
  const photoY = startY + 17;
  const photoW = 34;
  const photoH = 42;
  doc.setDrawColor(148, 163, 184);
  doc.rect(photoX, photoY, photoW, photoH);
  if (data.photoUrl) {
    try {
      doc.addImage(data.photoUrl, 'JPEG', photoX, photoY, photoW, photoH);
    } catch {
      try {
        doc.addImage(data.photoUrl, 'PNG', photoX, photoY, photoW, photoH);
      } catch {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
      }
    }
  } else {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Coach details
  let y = startY + 22;
  const textX = frontX + 45;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  const addDetail = (label: string, value: string) => {
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, textX, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(value, textX + 19, y);
    y += 6;
  };

  addDetail('Name', data.coachName);
  addDetail('Coach ID', data.coachCode);
  addDetail('Belt', data.beltRank || 'N/A');
  addDetail(
    'Experience',
    typeof data.experienceYears === 'number' ? `${data.experienceYears} years` : 'N/A'
  );

  // Front QR
  if (data.qrDataUrl) {
    try {
      doc.addImage(data.qrDataUrl, 'PNG', frontX + cardWidth - 29, startY + cardHeight - 29, 22, 22);
    } catch {
      // Ignore QR rendering failure in PDF fallback.
    }
  }

  // Signature and date placeholders
  const signatureY = startY + cardHeight - 9;
  doc.setDrawColor(100, 116, 139);
  doc.line(frontX + 8, signatureY, frontX + 62, signatureY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature', frontX + 8, signatureY + 3.5);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, frontX + cardWidth - 41, signatureY + 3.5);

  // Back card shell
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.roundedRect(backX, startY, cardWidth, cardHeight, 3, 3, 'S');
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(backX, startY, cardWidth, 13, 3, 3, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(backX, startY + 11, cardWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.tournamentName.toUpperCase(), backX + cardWidth / 2, startY + 6.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('OFFICIAL COACH IDENTIFICATION', backX + cardWidth / 2, startY + 10, { align: 'center' });

  if (data.qrDataUrl) {
    try {
      doc.addImage(data.qrDataUrl, 'PNG', backX + cardWidth / 2 - 20, startY + 22, 40, 40);
    } catch {
      // Ignore QR rendering failure in PDF fallback.
    }
  }

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Scan QR to validate coach identity and tournament access.', backX + cardWidth / 2, startY + 67, { align: 'center' });
  doc.text(`Coach ID: ${data.coachCode}`, backX + cardWidth / 2, startY + 72, { align: 'center' });

  return doc;
}

export async function generateCoachIdCardPDFBlob(data: CoachCardData): Promise<Blob> {
  const doc = buildCoachCardPdfDoc(data);
  return doc.output('blob');
}

export async function downloadCoachIdCardPDF(data: CoachCardData): Promise<void> {
  const doc = buildCoachCardPdfDoc(data);
  doc.save(`${data.coachCode}-coach-id-card.pdf`);
}
