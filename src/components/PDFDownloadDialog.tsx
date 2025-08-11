import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { PDFOrientation } from "@/hooks/useBracketPDF";
import { FileText, Maximize, Settings } from 'lucide-react'; // Import icons

interface PDFDialogOptions {
  tournamentHeader: string;
  organizedBy: string;
  pdfOrientation: PDFOrientation;
  fileName: string;
  noColorMode: boolean;
  lineViewMode: boolean; // New option for line view
  hideBye: boolean; // New option for hiding bye matches
}

interface PDFDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTournamentName: string;
  defaultOrganizerName?: string;
  defaultOrientation: PDFOrientation;
  onDownload: (options: PDFDialogOptions) => void;
  onPreview: (options: PDFDialogOptions) => void;
}

export const PDFDownloadDialog = ({
  open,
  onOpenChange,
  defaultTournamentName,
  defaultOrganizerName = "Your Organization Name",
  defaultOrientation,
  onDownload,
  onPreview,
}: PDFDownloadDialogProps) => {
  const [tournamentHeader, setTournamentHeader] = useState(defaultTournamentName);
  const [organizedBy, setOrganizedBy] = useState(defaultOrganizerName);
  const [pdfOrientation, setOrientation] = useState<PDFOrientation>(defaultOrientation);
  const [fileName, setFileName] = useState(`${defaultTournamentName.replace(/\s+/g, "_")}.pdf`);  const [noColorMode, setNoColorMode] = useState(false); // State for no-color mode
  const [lineViewMode, setLineViewMode] = useState(false); // State for line view mode
  const [hideBye, setHideBye] = useState(false); // State for hiding bye matches

  useEffect(() => {
    setTournamentHeader(defaultTournamentName);
    setFileName(`${defaultTournamentName.replace(/\s+/g, "_")}.pdf`);
  }, [defaultTournamentName]);

  useEffect(() => {
    setOrientation(defaultOrientation);
  }, [defaultOrientation]);
  
  useEffect(() => {
    if (defaultOrganizerName) {
      setOrganizedBy(defaultOrganizerName);
    }
  }, [defaultOrganizerName]);
  const handleDownload = () => {
    onDownload({
      tournamentHeader,
      organizedBy,
      pdfOrientation,
      fileName,
      noColorMode,
      lineViewMode, // Pass new option
      hideBye, // Pass hideBye option
    });
    onOpenChange(false);
  };
  const handlePreview = () => {
    onPreview({
      tournamentHeader,
      organizedBy,
      pdfOrientation,
      fileName,
      noColorMode,
      lineViewMode, // Pass new option
      hideBye, // Pass hideBye option
    });
  };  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px] h-[80vh] sm:h-[85vh] flex flex-col p-0 gap-0">        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 space-y-3 p-6 pb-4 border-b-2 border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg">
          <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
            PDF Export Configuration
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed hidden sm:block font-medium">
            Configure your tournament bracket export settings. All options can be adjusted to meet your specific requirements.
          </DialogDescription>
          <DialogDescription className="text-xs text-slate-600 block sm:hidden font-medium">
            Configure your PDF export settings
          </DialogDescription>
        </DialogHeader>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 sm:space-y-6">            {/* Document Information Section */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <FileText className="mr-2 h-4 w-4 text-slate-950 " />
                Document Information
              </h3>
              <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6 md:flex md:space-x-6 md:space-y-0">
                <div className="space-y-2">
                  <Label htmlFor="tournamentHeader" className="text-sm font-medium text-gray-700">
                    Tournament Title
                  </Label>
                  <Input
                    id="tournamentHeader"
                    value={tournamentHeader}
                    onChange={(e) => setTournamentHeader(e.target.value)}
                    className="w-full"
                    placeholder="Enter tournament name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizedBy" className="text-sm font-medium text-gray-700">
                    Organized By
                  </Label>
                  <Input
                    id="organizedBy"
                    value={organizedBy}
                    onChange={(e) => setOrganizedBy(e.target.value)}
                    className="w-full"
                    placeholder="Organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileName" className="text-sm font-medium text-gray-700">
                    File Name
                  </Label>
                  <Input
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full"
                    placeholder="tournament_bracket.pdf"
                  />
                </div>
              </div>
            </div>            {/* Page Settings Section */}
            <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-300">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Maximize className="mr-2 h-4 w-4 text-slate-950" />
                Page Settings (Orientation)
              </h3>
              <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6">
                <div className="space-y-3">
                  {/* <Label className="text-sm font-medium text-gray-700">Page Orientation</Label> */}
                  <RadioGroup
                    value={pdfOrientation}
                    onValueChange={(value) => setOrientation(value as PDFOrientation)}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="portrait" id="r-portrait" />
                      <Label htmlFor="r-portrait" className="flex items-center text-sm">
                        <FileText className="mr-2 h-3 w-3" /> 
                        Portrait
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="landscape" id="r-landscape" />
                      <Label htmlFor="r-landscape" className="flex items-center text-sm">
                        <Maximize className="mr-2 h-3 w-3" /> 
                        Landscape
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>            {/* Display Options Section */}
            <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-300">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-950">
                  Display Options
                </h3>
              </div>
              <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="noColorMode"
                      checked={noColorMode}
                      onCheckedChange={(checked) => setNoColorMode(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="noColorMode" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Black & White Mode
                      </Label>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        Optimize for monochrome printing and reduce ink usage
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="lineViewMode"
                      checked={lineViewMode}
                      onCheckedChange={(checked) => setLineViewMode(checked as boolean)}
                      disabled={hideBye}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="lineViewMode" className={`text-sm font-medium cursor-pointer ${hideBye ? 'text-gray-400' : 'text-gray-700'}`}>
                        Manual Tie-Sheet Style
                      </Label>
                      <p className={`text-xs hidden sm:block ${hideBye ? 'text-gray-400' : 'text-gray-500'}`}>
                        Use lines instead of boxes after the first round (traditional tournament format)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="hideBye"
                      checked={hideBye}
                      onCheckedChange={(checked) => setHideBye(checked as boolean)}
                      disabled={lineViewMode}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="hideBye" className={`text-sm font-medium cursor-pointer ${lineViewMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        Hide Bye Matches
                      </Label>
                      <p className={`text-xs hidden sm:block ${lineViewMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Hide bye matches while preserving bracket layout and spacing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          {/* Fixed Footer */}
        <DialogFooter className="flex flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-gray-200 bg-gray-50 rounded-b-lg">
          {/* Cancel button only shown on larger screens */}
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="hidden sm:flex w-auto border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </Button>
            {/* Preview and Download buttons in one row on mobile */}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePreview}
            className="sm:w-auto font-bold border-slate-800 text-slate-800 hover:border-slate-950 hover:border-2 text-sm sm:text-base"
          >
            Preview
          </Button>
          <Button 
            type="button" 
            onClick={handleDownload}
            className="sm:w-auto bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-900 hover:to-slate-950 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
          >
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
