import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Maximize, Minimize, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavbarProps {
  showNewButton?: boolean;
  onNewTournament?: () => void;
  onDownloadPDF?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  showNewButton = false,
  onNewTournament,
  onDownloadPDF,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const handleFullscreenToggle = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Tournament Bracket Generator</h1>
        
        {/* Desktop actions */}
        <div className="hidden md:flex items-center space-x-3">
          {showNewButton && (
            <Button 
              onClick={onNewTournament}
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
          
          {onDownloadPDF && (
            <Button 
              onClick={onDownloadPDF}
              variant="outline" 
              size="sm"
              className="text-slate-600"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <SheetHeader>
                <SheetTitle>Tournament Options</SheetTitle>
                <SheetDescription>
                  Manage your tournament bracket
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                {showNewButton && (
                  <Button 
                    onClick={onNewTournament}
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
                
                {onDownloadPDF && (
                  <Button 
                    onClick={onDownloadPDF}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default Navbar;