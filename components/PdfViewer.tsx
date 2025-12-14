import React from 'react';
import { FileText, Download, Eye, ExternalLink } from 'lucide-react';

interface PdfViewerProps {
  pdfUrl: string | null;
  fileName: string | null;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, fileName }) => {
  // Helper to detect Google Drive links and convert to preview mode
  const getEmbedConfig = (url: string | null) => {
    if (!url) return { url: '', isIframe: false };

    // Regex to extract ID from common Google Drive URL patterns
    const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([^/&?]+)/);
    
    if (driveMatch && driveMatch[1]) {
      // Convert to preview URL which is embeddable via iframe
      return { 
        url: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, 
        isIframe: true 
      };
    }

    // Default behavior for direct PDF links or Blobs
    return { url, isIframe: false };
  };

  const { url: embedUrl, isIframe } = getEmbedConfig(pdfUrl);

  if (!pdfUrl) {
    return (
      <div className="bg-slate-200 border-4 border-slate-300 border-dashed rounded-xl p-12 text-center text-slate-500">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-2xl font-semibold">Nenhum documento foi compartilhado ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* High Visibility Action Card */}
      <div className="bg-white rounded-xl shadow-lg border-l-8 border-accessible-blue p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-blue-100 p-4 rounded-full hidden md:block">
            <FileText className="w-12 h-12 text-accessible-blue" />
          </div>
          <div className="flex-grow">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              Documento do Evento
            </h3>
            <p className="text-lg text-slate-600 font-medium">
              {fileName || 'Documento disponível para visualização'}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 bg-white border-2 border-accessible-blue text-accessible-blue hover:bg-blue-50 font-bold text-xl px-6 py-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-3 text-center"
            aria-label="Abrir PDF em nova aba"
          >
            <ExternalLink className="w-6 h-6" />
            <span>Abrir em Nova Aba</span>
          </a>

          <a 
            href={pdfUrl} 
            download={fileName || 'documento-evento.pdf'}
            className="flex-1 bg-accessible-yellow hover:bg-yellow-400 text-black font-bold text-xl px-6 py-4 rounded-lg shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-center"
            aria-label={`Baixar ${fileName || 'Documento PDF'}`}
          >
            <Download className="w-6 h-6" />
            <span>Baixar PDF</span>
          </a>
        </div>
        
        <p className="text-slate-500 text-sm italic">
          * Dica: Se o documento não aparecer abaixo (comum em celulares), use o botão "Abrir em Nova Aba" ou "Baixar PDF".
        </p>
      </div>

      {/* Embedded Viewer (Desktop mainly) */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-slate-200">
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center gap-3">
          <Eye className="w-6 h-6 text-slate-700" />
          <h4 className="text-xl font-bold text-slate-800">Pré-visualização</h4>
        </div>
        <div className="w-full h-[600px] md:h-[800px] bg-slate-50 relative">
          {isIframe ? (
             <iframe 
               src={embedUrl} 
               className="w-full h-full border-0" 
               title="Visualização do Documento" 
               allow="autoplay"
             />
          ) : (
            <object
              data={embedUrl}
              type="application/pdf"
              className="w-full h-full"
              aria-label="Pré-visualização do Documento PDF"
            >
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-xl text-slate-700 mb-2 font-medium">
                  Visualização integrada não disponível neste navegador.
                </p>
                <p className="text-slate-500 mb-6">
                  Não se preocupe! Você ainda pode acessar o arquivo.
                </p>
                <a 
                  href={pdfUrl} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accessible-blue text-white font-bold text-lg px-6 py-3 rounded-lg shadow hover:bg-blue-800 transition-colors"
                >
                  Abrir Documento
                </a>
              </div>
            </object>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;