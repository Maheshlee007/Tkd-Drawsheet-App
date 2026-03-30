import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type ToastCallback = (toast: { type: 'default' | 'success' | 'destructive'; title: string; description: string }) => void;

function getActivePoolIndex(): string {
  const activePoolTab = document.querySelector('button[data-state="active"]');
  return activePoolTab?.getAttribute('value') || "0";
}

function getPrintViewElement(): HTMLElement | null {
  return document.querySelector(".print\\:block .bracket-display") as HTMLElement | null;
}

function createCloneContainer(poolIndex: string): HTMLDivElement {
  const cloneContainer = document.createElement('div');
  cloneContainer.style.position = 'absolute';
  cloneContainer.style.top = '-9999px';
  cloneContainer.style.left = '-9999px';
  cloneContainer.style.width = 'max-content';
  cloneContainer.style.backgroundColor = 'white';
  cloneContainer.style.padding = '20px';

  const title = document.createElement('h2');
  title.textContent = `Tournament Bracket - Pool ${parseInt(poolIndex) + 1}`;
  title.style.textAlign = 'center';
  title.style.fontWeight = 'bold';
  title.style.margin = '20px 0';
  cloneContainer.appendChild(title);

  return cloneContainer;
}

function getHtml2CanvasOptions(cloneContainer: HTMLDivElement) {
  return {
    backgroundColor: "#FFFFFF",
    scale: 1.5,
    allowTaint: true,
    useCORS: true,
    logging: false,
    onclone: (document: Document) => {
      const clonedStyles = document.createElement('style');
      clonedStyles.textContent = `
        .bracket-round {
          width: 180px !important;
          padding: 0 !important;
          margin-left: 20px !important;
        }
        .bracket-round:first-child {
          margin-left: 0 !important;
        }
        .bracket-match {
          padding: 0 !important;
          border: 1px solid #cbd5e1 !important;
          margin-bottom: 2px !important;
        }
        .participant {
          padding: 1px 2px !important;
          margin: 0 !important;
        }
        .bracket-connector {
          border-color: #666 !important;
        }
      `;
      document.head.appendChild(clonedStyles);
    }
  };
}

export async function exportBracketAsPNG(showToast: ToastCallback, onComplete?: () => void): Promise<void> {
  const poolIndex = getActivePoolIndex();
  const printView = getPrintViewElement();

  if (!printView) {
    showToast({ type: 'destructive', title: 'Export Error', description: 'Could not find bracket display element' });
    return;
  }

  const cloneContainer = createCloneContainer(poolIndex);
  const clone = printView.cloneNode(true) as HTMLElement;
  cloneContainer.appendChild(clone);
  document.body.appendChild(cloneContainer);

  try {
    const canvas = await html2canvas(cloneContainer, getHtml2CanvasOptions(cloneContainer));
    const link = document.createElement("a");
    link.download = `tournament-bracket-pool-${parseInt(poolIndex) + 1}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast({ type: 'success', title: 'Success', description: 'Bracket exported as PNG successfully!' });
  } catch (error) {
    console.error("Export error:", error);
    showToast({ type: 'destructive', title: 'Export Error', description: 'Failed to export bracket as PNG' });
  } finally {
    document.body.removeChild(cloneContainer);
    onComplete?.();
  }
}

export async function exportBracketAsPDF(showToast: ToastCallback, onComplete?: () => void): Promise<void> {
  const poolIndex = getActivePoolIndex();
  const printView = getPrintViewElement();

  if (!printView) {
    showToast({ type: 'destructive', title: 'Export Error', description: 'Could not find bracket display element' });
    return;
  }

  const cloneContainer = createCloneContainer(poolIndex);
  const clone = printView.cloneNode(true) as HTMLElement;
  cloneContainer.appendChild(clone);
  document.body.appendChild(cloneContainer);

  try {
    const canvas = await html2canvas(cloneContainer, getHtml2CanvasOptions(cloneContainer));
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
      unit: 'mm',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pdfWidth - 20;
    let imgHeight = (canvasHeight * imgWidth) / canvasWidth;

    if (imgHeight > pdfHeight - 20) {
      imgHeight = pdfHeight - 20;
      imgWidth = (canvasWidth * imgHeight) / canvasHeight;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`tournament-bracket-pool-${parseInt(poolIndex) + 1}.pdf`);
    showToast({ type: 'success', title: 'Success', description: 'Bracket exported as PDF successfully!' });
  } catch (error) {
    console.error("Export error:", error);
    showToast({ type: 'destructive', title: 'Export Error', description: 'Failed to export bracket as PDF' });
  } finally {
    document.body.removeChild(cloneContainer);
    onComplete?.();
  }
}

export async function copyBracketToClipboard(showToast: ToastCallback, onComplete?: () => void): Promise<void> {
  const poolIndex = getActivePoolIndex();
  const printView = getPrintViewElement();

  if (!printView) {
    showToast({ type: 'destructive', title: 'Copy Error', description: 'Could not find bracket display element' });
    return;
  }

  const cloneContainer = createCloneContainer(poolIndex);
  const clone = printView.cloneNode(true) as HTMLElement;
  cloneContainer.appendChild(clone);
  document.body.appendChild(cloneContainer);

  try {
    const canvas = await html2canvas(cloneContainer, getHtml2CanvasOptions(cloneContainer));
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob conversion failed'));
      }, 'image/png');
    });

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    showToast({ type: 'success', title: 'Success', description: 'Bracket copied to clipboard!' });
  } catch (error) {
    console.error("Copy error:", error);
    showToast({ type: 'destructive', title: 'Copy Error', description: 'Failed to copy bracket to clipboard' });
  } finally {
    document.body.removeChild(cloneContainer);
    onComplete?.();
  }
}
