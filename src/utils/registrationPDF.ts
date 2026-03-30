import jsPDF from 'jspdf';
import { PlayerRegistration } from '@/store/usePlayerStore';

/**
 * Generate a downloadable PDF registration card for a player.
 */
export async function generateRegistrationPDF(
  player: PlayerRegistration,
  qrDataUrl?: string | null
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // --- Header ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TOURNAMENT REGISTRATION DETAILS', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Taekwondo Draw Sheet System', pageWidth / 2, 23, { align: 'center' });

  // Player code
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Code: ${player.playerCode}`, pageWidth / 2, 31, { align: 'center' });

  y = 45;

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
  doc.setTextColor(30, 41, 59);

  const addSection = (title: string) => {
    y += 3;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y - 4, detailsWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin + 2, y);
    y += 6;
  };

  const addField = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text(`${label}:`, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(value, margin + 42, y);
    y += 5.5;
  };

  // Personal Information
  addSection('PERSONAL INFORMATION');
  addField('Full Name', player.fullName);
  addField('Date of Birth', player.dateOfBirth);
  addField('Gender', player.gender.charAt(0).toUpperCase() + player.gender.slice(1));
  if (player.guardianName) {
    addField('Guardian', player.guardianName);
  }
  addField('Phone', player.phone);
  addField('Email', player.email);
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
  addField('Belt', player.beltColor);
  if (player.danId) {
    addField('Dan ID', player.danId);
  }
  addField('Weight', `${player.weight} kg`);
  addField('Age Category', player.ageCategory);
  addField('Weight Category', player.weightCategory);
  if (player.club) {
    addField('Club', player.club);
  }
  if (player.coach) {
    addField('Coach', player.coach);
  }
  if (player.experience) {
    addField('Experience', player.experience);
  }

  // Official Verification (for weigh-in use)
  addSection('OFFICIAL VERIFICATION (For Weigh-in Use)');
  addField('Verified Category', '______________________');
  addField('Verified Weight', '______________________');

  // Verification Status
  addSection('VERIFICATION STATUS');
  addField('Aadhaar', player.aadhaarVerified ? 'Verified' : 'Not Verified');
  addField('Email', player.emailVerified ? 'Verified' : 'Not Verified');
  addField('Status', player.status.charAt(0).toUpperCase() + player.status.slice(1));

  // Tournament Info
  if (player.tournamentCode) {
    addSection('TOURNAMENT');
    addField('Tournament Code', player.tournamentCode);
  }

  // --- Document attachment area ---
  y = Math.max(y + 10, 180);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - 2 * margin, 40);
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text('Document Attachment Area (for official use)', pageWidth / 2, y + 5, { align: 'center' });
  doc.text('Attach supporting documents / ID proof here', pageWidth / 2, y + 10, { align: 'center' });

  // --- Footer ---
  y = 270;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setTextColor(150);
  doc.setFontSize(7);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Player Code: ${player.playerCode}`, margin, y + 5);
  doc.text('This card must be presented at weigh-in along with valid ID.', margin, y + 9);

  // --- Signature line ---
  y += 14;
  doc.setDrawColor(100);
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  doc.setTextColor(100);
  doc.setFontSize(7);
  doc.text('Official Stamp / Signature', pageWidth - margin - 30, y + 4, { align: 'center' });

  // Save
  doc.save(`${player.playerCode}-registration-card.pdf`);
}
