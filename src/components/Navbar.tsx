import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Download,
  Maximize,
  Minimize,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { useTournamentStore } from "@/store/useTournamentStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useState, useEffect } from "react";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { PDFGenOptions, useBracketPDF } from "@/hooks/useBracketPDF";

const Navbar = () => {
  const [location, navigate] = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    bracketData,
    tournamentName,
    participantCount,
    activeTournamentCode,
    activeTournamentLabel,
  } = useTournamentStore();
  const { generateBracketPDF, previewBracketPDF, orientation } = useBracketPDF();
  const [pdfDialogOptionsOpen, setPdfDialogOptionsOpen] = useState(false);
  const { user } = useAuthStore();

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => navigate('/logout');

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const handlePDFExportWithOptions = (options: PDFGenOptions) => {
    if (bracketData) {
      const header = options.tournamentHeader || tournamentName;
      generateBracketPDF(bracketData, header, participantCount, options);
    }
  };

  const handlePDFPreviewWithOptions = (options: PDFGenOptions) => {
    if (bracketData) {
      const header = options.tournamentHeader || tournamentName;
      previewBracketPDF(bracketData, header, participantCount, options);
    }
  };

  const primaryRole = user?.roles?.[0];
  const canSeeActiveTournament = !!user?.roles?.some((role) => ['organizer', 'jury', 'admin'].includes(String(role).toLowerCase()));

  return (<>
    <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="w-[98%] mx-4 pr-2 h-14 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center">
          <div className="relative mr-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-400 via-slate-200 to-slate-500">
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                <span
                  className="font-bold text-base"
                  style={{
                    background: 'linear-gradient(135deg, #7d8491, #e8e9eb, #70798a)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.1em',
                  }}
                >
                  ML
                </span>
              </div>
            </div>
          </div>
          <h1
            className="text-lg font-bold text-slate-800 cursor-pointer hidden sm:block"
            onClick={() => navigate("/")}
          >
            {bracketData ? tournamentName || "Tournament Bracket" : "TKD Tournament Manager"}
          </h1>
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center space-x-2">
          {canSeeActiveTournament && activeTournamentCode && (
            <Badge
              variant="secondary"
              className="hidden md:inline-flex font-mono text-[11px]"
              title={activeTournamentLabel || 'Active tournament'}
            >
              Active: {activeTournamentCode}
            </Badge>
          )}

          <Button
            onClick={handleFullscreenToggle}
            variant="ghost"
            size="icon"
            className="text-slate-500 hidden sm:flex"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          {bracketData && (
            <Button
              onClick={() => setPdfDialogOptionsOpen(true)}
              variant="ghost"
              size="icon"
              className="text-slate-500"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* User Avatar */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    {primaryRole && (
                      <Badge variant="outline" className="w-fit mt-1 text-[10px] capitalize">
                        {primaryRole}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>

    <PDFDownloadDialog
      open={pdfDialogOptionsOpen}
      onOpenChange={setPdfDialogOptionsOpen}
      defaultTournamentName={tournamentName}
      defaultOrientation={orientation}
      defaultOrganizerName="Professional Taekwondo Academy"
      onDownload={handlePDFExportWithOptions}
      onPreview={handlePDFPreviewWithOptions}
    />
  </>);
};

export default Navbar;
