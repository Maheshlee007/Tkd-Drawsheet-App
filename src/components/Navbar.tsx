import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Home as HomeIcon, 
  Download, 
  Maximize, 
  Minimize, 
  Menu, 
  Plus, 
  RefreshCw,
  Users,
  BarChart2,
  Megaphone,
  Settings,
  ClipboardList,
  RadioTower // Added RadioTower icon for Live Feed
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTournamentStore } from "@/store/useTournamentStore";
import { useState, useEffect } from "react";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog"; // Import the new dialog
import { PDFGenOptions, useBracketPDF } from "@/hooks/useBracketPDF";

const Navbar = () => {
  const [location, navigate] = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { bracketData, exportAsPDF, tournamentName,participantCount } = useTournamentStore();
  const { generateBracketPDF, previewBracketPDF, orientation, toggleOrientation } = useBracketPDF();
  const [pdfDialogOptionsOpen, setPdfDialogOptionsOpen] = useState(false); // State for new dialog

  // Update fullscreen state when user uses F11 or Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  const handleNewTournament = () => {
    navigate("/create");
  };

    // Handler for PDF generation with custom options from dialog
    const handlePDFExportWithOptions = (options: PDFGenOptions) => {
      if (bracketData) {
        // Ensure tournamentName from store is used if header is empty, or use the one from dialog
        const header = options.tournamentHeader || tournamentName;
        generateBracketPDF(bracketData, header, participantCount, options);
      }
    };
  
    // Handler for PDF preview with custom options from dialog
    const handlePDFPreviewWithOptions = (options: PDFGenOptions) => {
      if (bracketData) {
        // Ensure tournamentName from store is used if header is empty, or use the one from dialog
        const header = options.tournamentHeader || tournamentName;
        // console.log("Previewing PDF with options:", options);
        
        previewBracketPDF(bracketData, header, participantCount, options);
      }
    };

      // Handler for direct PDF generation - now opens the dialog
  const handleOpenPDFDialog = () => {
    setPdfDialogOptionsOpen(true);
  };
  

  return (<>
    <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="w-[98%] mx-4 pr-2 h-16 flex items-center justify-between">
        <div className="flex items-center">
          {/* Logo */}
          <div className="relative mr-2 cursor-pointer" onClick={() => navigate("/")}>
            {/* Outer silver circle */}
            <div className="h-11 w-11 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-400 via-slate-200 to-slate-500">
              {/* Inner white circle */}
              <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center">
                {/* ML text with silver gradient */}
                <span 
                  className="font-bold text-lg"
                  style={{
                    background: 'linear-gradient(135deg, #7d8491, #e8e9eb, #70798a)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.1em',
                    textShadow: '0px 1px 1px rgba(0,0,0,0.1)'
                  }}
                >
                  ML
                </span>
              </div>
            </div>
          </div>
          <h1 
            className="text-xl font-bold text-slate-800 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            {bracketData ? tournamentName || "Tournament Bracket" : "Tournament Bracket Generator"}
          </h1>
        </div>
        
        {/* Desktop actions */}
        <div className="hidden md:flex items-end space-x-3">
          {location !== "/" && bracketData && (
            <Button 
              onClick={handleNewTournament}
              variant="outline" 
              size="sm"
              className="text-slate-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              New Tournament
            </Button>
          )}
          
          <Button 
            onClick={handleFullscreenToggle}
            variant="outline" 
            size="sm"
            className="text-slate-600"
          >
            {isFullscreen ? (
              <>
                <Minimize className="mr-2 h-4 w-4" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize className="mr-2 h-4 w-4" />
                Fullscreen
              </>
            )}
          </Button>
          
          {bracketData && (
            <Button 
              onClick={handleOpenPDFDialog}
              variant="outline" 
              size="sm"
              className="text-slate-600"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
          <Button 
            onClick={() => navigate("/live-feed")}
            variant="outline" 
            size="sm"
            className="text-slate-600"
          >
            <RadioTower className="mr-2 h-4 w-4" />
            Live Feed
          </Button>
        </div>
          {/* Mobile menu - now on the right side */}
        <div className="md:hidden ">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-scroll scrollbar-hide">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                {/* <SheetDescription>
                  Navigate and manage your tournament
                </SheetDescription> */}
              </SheetHeader>
              <div className="mt-6 space-y-1">
                {/* Navigation Pages Section */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-slate-600 mb-3">Navigation</h4>
                  
                  <Button 
                    onClick={() => navigate("/")}
                    variant={location === "/" ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <HomeIcon className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/view")}
                    variant={location === "/view" ? "default" : "ghost"}
                    className="w-full justify-start"
                    disabled={!bracketData}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    View Tournament
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/participants")}
                    variant={location === "/participants" ? "default" : "ghost"}
                    className="w-full justify-start"
                    disabled={!bracketData}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Participants
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/statistics")}
                    variant={location === "/statistics" ? "default" : "ghost"}
                    className="w-full justify-start"
                    disabled={!bracketData}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Statistics
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/live-feed")}
                    variant={location === "/live-feed" ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <RadioTower className="mr-2 h-4 w-4" />
                    Live Feed
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/announcements")}
                    variant={location === "/announcements" ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Megaphone className="mr-2 h-4 w-4" />
                    Announcements
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/settings")}
                    variant={location === "/settings" ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>

                {/* Actions Section */}
                <div className="border-t pt-4 space-y-1">
                  <h4 className="text-sm font-medium text-slate-600 mb-3">Actions</h4>
                  
                  {location !== "/" && bracketData && (
                    <Button 
                      onClick={handleNewTournament}
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      New Tournament
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleFullscreenToggle}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize className="mr-2 h-4 w-4" />
                        Exit Fullscreen
                      </>
                    ) : (
                      <>
                        <Maximize className="mr-2 h-4 w-4" />
                        Fullscreen
                      </>
                    )}
                  </Button>
                  
                  {bracketData && (
                    <Button 
                      onClick={handleOpenPDFDialog}
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
       {/* PDF Download Options Modal */}
    <PDFDownloadDialog
      open={pdfDialogOptionsOpen}
      onOpenChange={setPdfDialogOptionsOpen}
      defaultTournamentName={tournamentName}
      defaultOrientation={orientation}
      defaultOrganizerName="Professional Taekwondo Academy"
      onDownload={handlePDFExportWithOptions}
      onPreview={handlePDFPreviewWithOptions} // Pass the new preview handler
    />
    </>
  );
};

export default Navbar;