import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface PDFPreviewProps {
  pdfData: ArrayBuffer | Uint8Array | string; // ArrayBuffer, typed array, or base64-encoded string
  title?: string;
  onClose?: () => void;
}

export default function PDFPreview({ pdfData, title = 'PDF Preview', onClose }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      setLoading(true);
      try {
        let data: Parameters<typeof pdfjsLib.getDocument>[0];
        if (typeof pdfData === 'string') {
          // base64
          data = { data: atob(pdfData) };
        } else {
          data = { data: pdfData };
        }
        const doc = await pdfjsLib.getDocument(data).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Failed to load PDF:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [pdfData]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Auto-scale to fit container width on mobile
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const container = canvasRef.current.parentElement;
    if (container) {
      const containerWidth = container.clientWidth - 32; // padding
      pdfDoc.getPage(currentPage).then(page => {
        const defaultViewport = page.getViewport({ scale: 1.0 });
        const fitScale = containerWidth / defaultViewport.width;
        setScale(Math.min(fitScale, 2.0));
      });
    }
  }, [pdfDoc, currentPage]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {onClose && <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="overflow-auto border rounded-md bg-muted/20 max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <canvas ref={canvasRef} className="mx-auto block" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
