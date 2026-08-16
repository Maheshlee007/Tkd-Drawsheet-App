import jsPDF from 'jspdf';
import { PlayerRegistration } from '@/store/usePlayerStore';

interface RegistrationPdfOptions {
  tournamentName?: string;
}

/** Extra API-provided data available when the player came from the backend */
type PdfPlayer = PlayerRegistration & {
  pricing?: {
    totalFee: number;
    firstEventFee?: number;
    additionalEventFee?: number;
    eventFees?: number[];
    currency?: string;
    mode?: string;
    subtotal?: number;
    lines?: Array<{ eventType?: string; label?: string; amount?: number }>;
    lateFee?: { applied?: boolean; amount?: number; mode?: string };
  };
  events?: Array<{ eventType?: string; entryFeePaid?: number; teamName?: string | null } | string>;
  paymentStatus?: string;
};

/** '2012-04-15' | ISO timestamp | Date → 'dd/mm/yyyy' (en-IN); raw value if unparsable */
function fmtDate(value: unknown): string {
  if (!value) return '—';
  const s = String(value);
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN');
}

/** Safe capitalize — never throws on empty/undefined */
function cap(value: unknown): string {
  const s = String(value ?? '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

/** Mask an Aadhaar number: show last 4 only */
function maskAadhaar(aadhaar?: string): string | null {
  const digits = String(aadhaar ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX-XXXX-${digits.slice(-4)}` : null;
}

function buildRegistrationPDFDoc(
  player: PdfPlayer,
  qrDataUrl?: string | null,
  options?: RegistrationPdfOptions
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  // Content must never run into the footer band (footer starts at pageHeight - 27).
  const contentBottom = pageHeight - 32;
  let y = margin;

  // Slim repeated header for continuation pages
  const drawContinuationHeader = () => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 12, pageWidth, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `PLAYER REGISTRATION FORM — ${player.playerCode} (continued)`,
      pageWidth / 2,
      8,
      { align: 'center' }
    );
    doc.setTextColor(30, 41, 59);
  };

  /**
   * Make sure `needed` mm of vertical space is available below `yPos`.
   * If not, adds a page (with a slim header line) and returns the reset y.
   */
  const ensureSpace = (docRef: jsPDF, yPos: number, needed: number): number => {
    if (yPos + needed <= contentBottom) return yPos;
    docRef.addPage();
    drawContinuationHeader();
    return 20;
  };

  // --- Header (first page) ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 36, pageWidth, 4, 'F');

  // WT emblem
  const badgeCenterX = margin + 8;
  const badgeCenterY = 18;
  doc.setFillColor(255, 255, 255);
  doc.circle(badgeCenterX, badgeCenterY, 8, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.7);
  doc.circle(badgeCenterX, badgeCenterY, 8, 'S');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('WT', badgeCenterX, badgeCenterY + 2.5, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAYER REGISTRATION FORM', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const title = (options?.tournamentName || 'TOURNAMENT').toUpperCase();
  doc.text(doc.splitTextToSize(title, pageWidth - 70), pageWidth / 2, 21, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('World Taekwondo Registration Sheet', pageWidth / 2, 27, { align: 'center' });

  // Player code
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Code: ${player.playerCode}`, pageWidth / 2, 33, { align: 'center' });

  y = 50;

  // --- Photo placeholder (right side) and QR (below photo) ---
  const photoX = pageWidth - margin - 40;
  const photoY = y;
  doc.setDrawColor(180);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, 40, 50);
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Paste Photo Here', photoX + 20, photoY + 25, { align: 'center' });
  doc.text('(35mm x 45mm)', photoX + 20, photoY + 30, { align: 'center' });

  // QR code below photo
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', photoX + 5, photoY + 55, 30, 30);
      doc.setTextColor(100);
      doc.setFontSize(6);
      doc.text('Scan for check-in', photoX + 20, photoY + 88, { align: 'center' });
    } catch {
      // QR image failed, skip
    }
  }

  // --- Player details (left side) ---
  const detailsWidth = photoX - margin - 5;
  const labelX = margin + 2;
  const valueX = margin + 42;
  const valueWidth = detailsWidth - (valueX - margin) - 2;
  doc.setTextColor(30, 41, 59);

  const addSection = (sectionTitle: string) => {
    // Never orphan a section header at the bottom of a page: require room
    // for the header plus at least one field line.
    y = ensureSpace(doc, y, 17);
    y += 3;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y - 4, detailsWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(sectionTitle, labelX, y);
    y += 6;
  };

  // Wrap long values inside the left column instead of overflowing the page
  const addField = (label: string, value: string, opts?: { bold?: boolean }) => {
    const lines: string[] = doc.splitTextToSize(String(value ?? '—') || '—', valueWidth);
    const blockHeight = 5.5 + (lines.length - 1) * 4;
    y = ensureSpace(doc, y, blockHeight);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text(`${label}:`, labelX, y);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(lines, valueX, y);
    y += blockHeight;
  };

  // Personal Information
  addSection('PERSONAL INFORMATION');
  addField('Full Name', player.fullName);
  addField('Date of Birth', fmtDate(player.dateOfBirth));
  addField('Gender', cap(player.gender));
  if (player.guardianName) {
    addField('Guardian', player.guardianName);
  }
  addField('Phone', player.phone);
  addField('Email', player.email || '—');
  const maskedAadhaar = maskAadhaar(player.aadhaarNumber);
  if (maskedAadhaar) {
    addField('Aadhaar (masked)', maskedAadhaar);
  }
  if (player.occupation) {
    addField('Occupation', player.occupation);
  }

  // Address
  if (player.address || player.state || player.district || player.pincode) {
    addSection('ADDRESS');
    if (player.address) {
      addField('Address', player.address);
    }
    if (player.state) {
      addField('State', player.state);
    }
    if (player.district) {
      addField('District', player.district);
    }
    if (player.pincode) {
      addField('Pincode', player.pincode);
    }
  }

  // Taekwondo Details
  addSection('TAEKWONDO DETAILS');
  addField('Belt', cap(player.beltColor));
  if (player.danId) {
    addField('Dan ID', player.danId);
  }
  addField('Weight', `${player.weight} kg`);
  addField('Age Category', player.ageCategory || '—');
  addField('Weight Category', player.weightCategory || '—');
  if (player.club) {
    addField('Club', player.club);
  }
  if (player.coach) {
    addField('Coach', player.coach);
  }
  if (player.experience) {
    addField('Experience', player.experience);
  }

  // Events & Fee Breakdown (from the backend registration response)
  const events = (player.events ?? []).map(e =>
    typeof e === 'string' ? { eventType: e, entryFeePaid: undefined as number | undefined } : e);
  const pricing = player.pricing;
  if (events.length > 0 || pricing) {
    addSection('EVENTS & FEE BREAKDOWN');
    const feeLines = pricing?.lines;
    if (feeLines && feeLines.length > 0) {
      // Server-authoritative per-event lines
      feeLines.forEach((line, i) => {
        const name = line.label || cap(String(line.eventType ?? '').replace(/_/g, ' '));
        addField(`Event ${i + 1}`, `${name} — Rs. ${line.amount ?? 0}`);
      });
      // Team names still come from the enrolled-events array
      events.forEach(e => {
        if ('teamName' in e && e.teamName) {
          addField('Team', `${cap(String(e.eventType ?? '').replace(/_/g, ' '))}: ${e.teamName}`);
        }
      });
    } else {
      // Legacy fallback: derive lines from the enrolled-events array
      events.forEach((e, i) => {
        const fee = e.entryFeePaid ?? pricing?.eventFees?.[i];
        const name = cap(String(e.eventType ?? '').replace(/_/g, ' '));
        addField(`Event ${i + 1}`, fee != null ? `${name} — Rs. ${fee}` : name);
        if ('teamName' in e && e.teamName) addField('Team', String(e.teamName));
      });
    }
    if (pricing) {
      if (pricing.subtotal != null) {
        addField('Subtotal', `Rs. ${pricing.subtotal}`);
      }
      if (pricing.lateFee?.applied) {
        const perEvent = pricing.lateFee.mode === 'per_event' ? ' per event' : '';
        addField('Late Fee', `+ Rs. ${pricing.lateFee.amount ?? 0}${perEvent}`);
      }
      addField('Total', `Rs. ${pricing.totalFee}`, { bold: true });
    }
    addField('Payment Status', cap(player.paymentStatus ?? 'unpaid'));
  }

  // Official Verification (for weigh-in use)
  addSection('OFFICIAL VERIFICATION (For Weigh-in Use)');
  addField('Verified Category', '______________________');
  addField('Verified Weight', '______________________');
  addField('Fee Collected', 'Rs. ________  (Balance: Rs. ________)');

  // Verification Status
  addSection('VERIFICATION STATUS');
  addField('Aadhaar', player.aadhaarVerified ? 'Verified' : 'Pending (verify at check-in)');
  addField('Email', player.emailVerified ? 'Verified' : 'Pending');
  addField('Status', cap(player.status));

  // Tournament Info
  if (player.tournamentCode) {
    addSection('TOURNAMENT');
    addField('Tournament Code', player.tournamentCode);
  }

  // --- Document attachment area (flows below content, paginating if needed) ---
  y += 6;
  if (doc.getNumberOfPages() === 1) {
    // On the first page the box must clear the photo/QR column on the right.
    y = Math.max(y, photoY + 92);
  }
  y = ensureSpace(doc, y, 42);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - 2 * margin, 40);
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Document Attachment Area (for official use)', pageWidth / 2, y + 5, { align: 'center' });
  doc.text('Attach supporting documents / ID proof here', pageWidth / 2, y + 10, { align: 'center' });
  y += 42;

  // --- Footer + signature (last page only, fixed at page bottom) ---
  const footerY = pageHeight - 27;
  y = footerY;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setTextColor(150);
  doc.setFontSize(7);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} | Player Code: ${player.playerCode}`, margin, y + 5);
  if (options?.tournamentName) {
    doc.text(doc.splitTextToSize(`Tournament: ${options.tournamentName}`, pageWidth - 2 * margin - 70), margin, y + 9);
    doc.text('This form must be presented at weigh-in along with valid ID.', margin, y + 13);
  } else {
    doc.text('This form must be presented at weigh-in along with valid ID.', margin, y + 9);
  }

  // --- Signature line ---
  y += 14;
  doc.setDrawColor(100);
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  doc.setTextColor(100);
  doc.setFontSize(7);
  doc.text('Official Stamp / Signature', pageWidth - margin - 30, y + 4, { align: 'center' });

  return doc;
}

/**
 * Generate a downloadable PDF registration form for a player.
 */
export async function generateRegistrationPDF(
  player: PlayerRegistration,
  qrDataUrl?: string | null,
  options?: RegistrationPdfOptions
): Promise<void> {
  const doc = buildRegistrationPDFDoc(player, qrDataUrl, options);
  doc.save(`${player.playerCode}-registration-form.pdf`);
}

export async function generateRegistrationPDFBlob(
  player: PlayerRegistration,
  qrDataUrl?: string | null,
  options?: RegistrationPdfOptions
): Promise<Blob> {
  const doc = buildRegistrationPDFDoc(player, qrDataUrl, options);
  return doc.output('blob');
}
