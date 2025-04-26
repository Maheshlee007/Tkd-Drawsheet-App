import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, FileImage, FileText, Copy } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportAsPNG: () => void;
  onExportAsPDF: () => void;
  onCopyToClipboard: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportAsPNG,
  onExportAsPDF,
  onCopyToClipboard,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="text-lg font-semibold text-slate-800">Export Bracket</DialogTitle>
          {/* <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-500" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button> */}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Button
            variant="outline"
            className="flex items-center justify-center w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            onClick={onExportAsPNG}
          >
            <FileImage className="h-5 w-5 mr-2 text-slate-500" />
            Save as PNG
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-center w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            onClick={onExportAsPDF}
          >
            <FileText className="h-5 w-5 mr-2 text-slate-500" />
            Save as PDF
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-center w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            onClick={onCopyToClipboard}
          >
            <Copy className="h-5 w-5 mr-2 text-slate-500" />
            Copy to Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
