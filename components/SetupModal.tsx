import React, { useState, useEffect } from 'react';
import { Settings, Upload, X, RotateCcw, Sparkles, Link as LinkIcon } from 'lucide-react';
import { EventData } from '../types';

interface SetupModalProps {
  onSave: (data: EventData | null) => void;
  currentData: EventData;
  showTrigger: boolean;
  isManualOverride?: boolean;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
}

const SetupModal: React.FC<SetupModalProps> = ({ 
  onSave, 
  currentData, 
  showTrigger, 
  isManualOverride,
  onGenerateSummary,
  isGeneratingSummary
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(currentData.title);
  
  // Initialize date safely
  const formatForInput = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [date, setDate] = useState(formatForInput(currentData.targetDate));
  const [description, setDescription] = useState(currentData.description);
  const [notes, setNotes] = useState(currentData.notes || "");
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrlInput, setPdfUrlInput] = useState(currentData.pdfUrl || "");

  useEffect(() => {
    if (!isOpen) {
      setTitle(currentData.title);
      setDate(formatForInput(currentData.targetDate));
      setDescription(currentData.description);
      setNotes(currentData.notes || "");
      setPdfUrlInput(currentData.pdfUrl || "");
      setFile(null);
    }
  }, [currentData, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Clear manual URL if file is picked to avoid confusion
      setPdfUrlInput(""); 
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logic: If a file is uploaded, use blob. If text is entered, use text. Fallback to existing.
    let finalPdfUrl = currentData.pdfUrl;
    let finalFileName = currentData.fileName;

    if (file) {
      finalPdfUrl = URL.createObjectURL(file);
      finalFileName = file.name;
    } else if (pdfUrlInput && pdfUrlInput !== currentData.pdfUrl) {
      finalPdfUrl = pdfUrlInput;
      finalFileName = "Documento Online (Link)";
    }
    
    onSave({
      title,
      dayLabel: currentData.dayLabel, // Preserve the label logic unless overridden manually
      dayIndex: currentData.dayIndex, // Preserve day index
      targetDate: new Date(date),
      description,
      notes,
      pdfUrl: finalPdfUrl,
      fileName: finalFileName
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    if (window.confirm("Tem certeza? Isso irá restaurar a programação automática da Novena.")) {
      onSave(null);
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    if (!showTrigger) return null;
    
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full shadow-lg z-[60] transition-colors opacity-80 hover:opacity-100 animate-fade-in"
        title="Editar Configurações do Evento"
      >
        <Settings className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-accessible-blue p-4 flex justify-between items-center shrink-0">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Evento
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Day Label Info */}
          <div className="bg-blue-50 text-accessible-blue px-4 py-2 rounded-lg text-center font-bold">
            Editando: {currentData.dayLabel || "Configuração Geral"}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-2">Título do Evento</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-lg p-3 text-lg focus:border-accessible-blue focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-2">Data e Hora</label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-lg p-3 text-lg focus:border-accessible-blue outline-none"
            />
          </div>

          <div>
             <label className="block text-slate-700 font-bold mb-2">Mensagem de Boas-vindas</label>
             <textarea
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               className="w-full border-2 border-slate-300 rounded-lg p-3 text-lg focus:border-accessible-blue outline-none"
               rows={2}
             />
          </div>

          <div>
             <label className="block text-slate-700 font-bold mb-2">Notas / Reflexão do Dia (Salvo no histórico)</label>
             <textarea
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full border-2 border-yellow-300 bg-yellow-50 rounded-lg p-3 text-lg focus:border-accessible-blue outline-none"
               placeholder="Escreva aqui a reflexão ou anotações deste dia..."
               rows={3}
             />
          </div>

          <div className="border-t pt-4">
            <label className="block text-slate-700 font-bold mb-2">Documento PDF</label>
            <p className="text-sm text-slate-500 mb-3">
              Para compartilhar com outras pessoas, o arquivo deve estar na internet (Google Drive, Dropbox, ou no site). O upload abaixo é apenas para visualização local.
            </p>

            <div className="space-y-3">
              {/* URL Input */}
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Cole aqui o link público do PDF (ex: Google Drive)"
                  value={pdfUrlInput}
                  onChange={(e) => {
                    setPdfUrlInput(e.target.value);
                    setFile(null); // Clear file if typing URL
                  }}
                  className="w-full border-2 border-slate-300 rounded-lg p-2 text-sm focus:border-accessible-blue outline-none"
                />
              </div>

              <div className="text-center text-slate-400 font-bold text-xs">OU</div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                <p className="text-slate-600 font-medium text-sm">
                  {file 
                    ? `Selecionado: ${file.name}` 
                    : "Escolher arquivo do dispositivo (Local)"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              className="w-full bg-accessible-blue hover:bg-blue-800 text-white font-bold text-xl py-4 rounded-lg shadow transition-colors"
            >
              Salvar e Atualizar
            </button>
            
            {/* AI Generation Button */}
            <button
              type="button"
              onClick={onGenerateSummary}
              disabled={isGeneratingSummary}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold text-lg py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-5 h-5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
              {isGeneratingSummary ? 'Gerando Mensagem...' : 'Gerar Mensagem de Natal (IA)'}
            </button>

            {isManualOverride && (
              <button
                type="button"
                onClick={handleReset}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-lg py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Restaurar Automático
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupModal;