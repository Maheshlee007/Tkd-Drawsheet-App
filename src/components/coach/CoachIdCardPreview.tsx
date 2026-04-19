import React from 'react';

interface CoachIdCardPreviewProps {
  coachCode: string;
  coachName: string;
  tournamentCode: string;
  tournamentName: string;
  beltRank?: string;
  experienceYears?: number;
  photoUrl?: string;
  qrDataUrl?: string | null;
}

export const CoachIdCardPreview: React.FC<CoachIdCardPreviewProps> = ({
  coachCode,
  coachName,
  tournamentCode,
  tournamentName,
  beltRank,
  experienceYears,
  photoUrl,
  qrDataUrl,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
        <div className="bg-slate-800 text-white px-3 py-2 border-b-2 border-red-600">
          <p className="text-[11px] uppercase tracking-wide font-semibold">Official Coach ID Card</p>
          <p className="text-[10px] opacity-90 truncate">{tournamentName}</p>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex gap-3">
            <div className="h-32 w-24 rounded border bg-slate-50 overflow-hidden flex items-center justify-center text-[10px] text-slate-400">
              {photoUrl ? (
                <img src={photoUrl} alt="Coach" className="h-full w-full object-cover" />
              ) : (
                'PHOTO'
              )}
            </div>
            <div className="flex-1 text-sm space-y-1.5">
              <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{coachName}</span></p>
              <p><span className="text-slate-500">Coach ID:</span> <span className="font-mono font-semibold">{coachCode}</span></p>
              <p><span className="text-slate-500">Tournament:</span> <span className="font-mono">{tournamentCode}</span></p>
              <p><span className="text-slate-500">Belt:</span> {beltRank || 'N/A'}</p>
              <p><span className="text-slate-500">Experience:</span> {typeof experienceYears === 'number' ? `${experienceYears} years` : 'N/A'}</p>
            </div>
          </div>
          <div className="flex justify-between items-end gap-2">
            <div className="text-[10px] text-slate-500 w-full">
              <div className="border-b border-slate-400 mb-1 h-6" />
              Signature
            </div>
            <div className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString()}</div>
          </div>
          {qrDataUrl && (
            <div className="flex justify-end">
              <img src={qrDataUrl} alt="Coach QR" className="h-24 w-24 rounded border bg-white p-1" />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
        <div className="bg-slate-800 text-white px-3 py-2 border-b-2 border-red-600">
          <p className="text-[11px] uppercase tracking-wide font-semibold truncate">{tournamentName}</p>
          <p className="text-[10px] opacity-90">Coach ID Verification</p>
        </div>
        <div className="p-3 flex flex-col items-center justify-center min-h-[240px]">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Coach QR Back" className="h-44 w-44 rounded border bg-white p-2" />
          ) : (
            <div className="h-44 w-44 rounded border bg-slate-50 flex items-center justify-center text-xs text-slate-400">QR</div>
          )}
          <p className="text-xs text-slate-500 mt-3 text-center">Scan to validate coach identity and tournament access.</p>
          <p className="text-xs font-mono mt-1">{coachCode}</p>
        </div>
      </div>
    </div>
  );
};
