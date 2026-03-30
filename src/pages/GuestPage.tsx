import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Trophy, Download, Eye, LogIn, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { createBracket } from '@/lib/bracketUtils';
import { BracketMatch } from '@shared/schema';
import { useBracketPDF, PDFGenOptions } from '@/hooks/useBracketPDF';

const GuestPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [playerCount, setPlayerCount] = useState<number>(8);
  const [tournamentName, setTournamentName] = useState('');
  const [bracketStyle, setBracketStyle] = useState<'manual' | 'filled'>('manual');
  const [bracketData, setBracketData] = useState<BracketMatch[][] | null>(null);
  const [generated, setGenerated] = useState(false);

  // PDF options
  const [noColorMode, setNoColorMode] = useState(true);
  const [lineViewMode, setLineViewMode] = useState(true);
  const [hideBye, setHideBye] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Preview state
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { generateBracketPDF, generatePDFDataUri } = useBracketPDF();

  const handleStyleChange = (style: 'manual' | 'filled') => {
    setBracketStyle(style);
    if (style === 'manual') {
      setNoColorMode(true);
      setLineViewMode(true);
    } else {
      setNoColorMode(false);
      setLineViewMode(false);
    }
  };

  const getPDFOptions = (): PDFGenOptions => {
    const name = tournamentName || 'Tournament Draw Sheet';
    return {
      tournamentHeader: name,
      organizedBy: '',
      fileName: `${name.replace(/\s+/g, '-').toLowerCase()}-drawsheet`,
      pdfOrientation,
      noColorMode,
      lineViewMode,
      hideBye,
    };
  };

  const handleGenerate = async () => {
    if (playerCount < 2 || playerCount > 128) return;
    let participants: string[];
    if (bracketStyle === 'manual') {
      participants = Array.from({ length: playerCount }, () => `_`);
    } else {
      participants = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
    }
    const data = createBracket(participants, 'as-entered');
    setBracketData(data);
    setGenerated(true);
    setPdfDataUri(null);

    // Auto-preview the PDF
    if (generatePDFDataUri) {
      setPreviewLoading(true);
      try {
        const name = tournamentName || 'Tournament Draw Sheet';
        const options: PDFGenOptions = {
          tournamentHeader: name,
          organizedBy: '',
          fileName: `${name.replace(/\s+/g, '-').toLowerCase()}-drawsheet`,
          pdfOrientation,
          noColorMode,
          lineViewMode,
          hideBye,
        };
        const uri = await generatePDFDataUri(data, name, playerCount, options);
        if (uri) setPdfDataUri(uri);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handlePreviewPDF = async () => {
    if (!bracketData || !generatePDFDataUri) return;
    setPreviewLoading(true);
    try {
      const name = tournamentName || 'Tournament Draw Sheet';
      const uri = await generatePDFDataUri(bracketData, name, playerCount, getPDFOptions());
      if (uri) setPdfDataUri(uri);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!bracketData) return;
    const name = tournamentName || 'Tournament Draw Sheet';
    generateBracketPDF(bracketData, name, playerCount, getPDFOptions());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Quick Drawsheet</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Guest Mode - Generate & Download</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!generated ? (
          <div className="max-w-lg mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Generate Tournament Drawsheet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="player-count" className="text-sm font-medium">Number of Players</Label>
                  <Input id="player-count" type="number" min={2} max={128} value={playerCount}
                    onChange={(e) => setPlayerCount(parseInt(e.target.value) || 2)} className="mt-1" autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && playerCount >= 2) handleGenerate(); }} />
                  {(playerCount < 2 || playerCount > 128) && <p className="text-sm text-red-500 mt-1">Enter between 2-128 players</p>}
                </div>

                <div>
                  <Label htmlFor="tournament-name" className="text-sm font-medium">
                    Tournament Name <span className="text-slate-400">(optional)</span>
                  </Label>
                  <Input id="tournament-name" placeholder="e.g., District Championship 2026" value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Drawsheet Style</Label>
                  <RadioGroup value={bracketStyle} onValueChange={(v) => handleStyleChange(v as 'manual' | 'filled')} className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${bracketStyle === 'manual' ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <RadioGroupItem value="manual" className="sr-only" />
                      <div className="text-2xl mb-1">&#9997;</div>
                      <span className="text-sm font-medium">Manual Tie Sheet</span>
                      <span className="text-xs text-slate-500 text-center mt-1">B&W with blank lines</span>
                    </label>
                    <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${bracketStyle === 'filled' ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <RadioGroupItem value="filled" className="sr-only" />
                      <div className="text-2xl mb-1">&#128196;</div>
                      <span className="text-sm font-medium">Filled Template</span>
                      <span className="text-xs text-slate-500 text-center mt-1">Player 1, Player 2...</span>
                    </label>
                  </RadioGroup>
                </div>

                {/* PDF Options */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-3 block">PDF Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="bw" checked={noColorMode} onCheckedChange={(v) => setNoColorMode(v === true)} />
                      <label htmlFor="bw" className="text-sm cursor-pointer">Black & White Mode</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="lineview" checked={lineViewMode} onCheckedChange={(v) => setLineViewMode(v === true)} disabled={hideBye} />
                      <label htmlFor="lineview" className="text-sm cursor-pointer">Manual Tie-Sheet Lines</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="hidebyes" checked={hideBye} onCheckedChange={(v) => setHideBye(v === true)} disabled={lineViewMode} />
                      <label htmlFor="hidebyes" className="text-sm cursor-pointer">Hide Bye Matches</label>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1.5 block">Orientation</Label>
                      <RadioGroup value={pdfOrientation} onValueChange={(v) => setPdfOrientation(v as 'landscape' | 'portrait')} className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="landscape" id="landscape" />
                          <label htmlFor="landscape" className="text-sm cursor-pointer">Landscape</label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="portrait" id="portrait" />
                          <label htmlFor="portrait" className="text-sm cursor-pointer">Portrait</label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleGenerate} disabled={playerCount < 2 || playerCount > 128}>
                  <Eye className="h-4 w-4 mr-2" />
                  Generate & Preview
                </Button>
                <p className="text-center text-xs text-slate-400">Sign in for full features: scoring, player management, live feed & more</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button variant="outline" size="sm" onClick={() => { setGenerated(false); setBracketData(null); setPdfDataUri(null); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex-1 text-center truncate">
                {tournamentName || 'Tournament Draw Sheet'} - {playerCount} Players
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviewPDF} disabled={previewLoading}>
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  <span className="hidden sm:inline">Preview</span>
                </Button>
                <Button size="sm" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </div>
            </div>

            {pdfDataUri ? (
              <div className="bg-white rounded-lg border shadow-sm relative" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
                <object data={pdfDataUri} type="application/pdf" className="w-full h-full rounded-lg">
                  <iframe src={`${pdfDataUri}#view=FitH`} className="w-full h-full rounded-lg" title="PDF Preview">
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <FileText className="h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-slate-600 mb-4">PDF preview is not supported on this device.</p>
                      <Button onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                      </Button>
                    </div>
                  </iframe>
                </object>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center py-16 px-4 text-center">
                {previewLoading ? (
                  <>
                    <Loader2 className="h-12 w-12 text-slate-400 mb-4 animate-spin" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">Generating Preview...</h3>
                  </>
                ) : (
                  <>
                    <FileText className="h-16 w-16 text-slate-300 mb-4" />
                    <p className="text-sm text-slate-400 mb-6 max-w-sm">
                      Click "Preview" to view your drawsheet, or "Download" to save it directly.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handlePreviewPDF}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview PDF
                      </Button>
                      <Button onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <details className="mt-4 bg-white rounded-lg border p-4">
              <summary className="font-medium text-sm text-slate-700 cursor-pointer">Change PDF Options</summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bw2" checked={noColorMode} onCheckedChange={(v) => setNoColorMode(v === true)} />
                    <label htmlFor="bw2" className="text-sm cursor-pointer">Black & White</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="line2" checked={lineViewMode} onCheckedChange={(v) => setLineViewMode(v === true)} disabled={hideBye} />
                    <label htmlFor="line2" className="text-sm cursor-pointer">Manual Tie-Sheet Lines</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="bye2" checked={hideBye} onCheckedChange={(v) => setHideBye(v === true)} disabled={lineViewMode} />
                    <label htmlFor="bye2" className="text-sm cursor-pointer">Hide Byes</label>
                  </div>
                </div>
                <div>
                  <RadioGroup value={pdfOrientation} onValueChange={(v) => setPdfOrientation(v as 'landscape' | 'portrait')} className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="landscape" id="land2" />
                      <label htmlFor="land2" className="text-sm cursor-pointer">Landscape</label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="portrait" id="port2" />
                      <label htmlFor="port2" className="text-sm cursor-pointer">Portrait</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPage;
