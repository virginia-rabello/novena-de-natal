import React, { useState, useEffect, useCallback } from 'react';
import CountdownTimer from './components/CountdownTimer';
import PdfViewer from './components/PdfViewer';
import SetupModal from './components/SetupModal';
import { EventData } from './types';
import { Info, Share2, MessageCircleHeart, Save, Gift } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION AREA (EDIT THIS FOR EVERYONE) ---
const EVENT_CONFIG = {
  // 1. Event Date & Time (Start of the first day)
  year: 2025,
  month: 11,     // Note: 0 = January, 11 = December
  day: 15,       // Day of the month (Updated to start one day later)
  hour: 20,      // 24-hour format (20 = 8 PM)
  minute: 30,    // Minute
  
  // Timezone Offset (Important for global sync)
  timezoneOffset: "-03:00", 
  
  // 2. Event Details
  defaultTitle: "Novena de Natal 2025",
  defaultDescription: "Bem-vindos. Participe da video chamada no Whatsapp e baixe o folheto para rezar conosco.",
  
  // 3. File / PDF Details
  // IMPORTANT: This must be a path to a file in the public folder or a full URL.
  pdfUrl: "./Folheto_Novena_2025.pdf", 
  fileName: "Folheto_Novena_2025.pdf",

  // 4. Advanced Logic
  durationDays: 9, 
  eventWindowHours: 4 
};
// ---------------------------------------------------

const ORDINAL_DAYS = [
  "Primeiro", "Segundo", "Terceiro", "Quarto", "Quinto", 
  "Sexto", "Sétimo", "Oitavo", "Nono"
];

// Helper to get notes from storage
const getStoredNotes = (): Record<number, string> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('novena_notes_history') || '{}');
  } catch {
    return {};
  }
};

// Helper to get published christmas message
const getStoredChristmasMessage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('novena_christmas_message');
}

// Helper to determine the current state based on config
const calculateEventState = () => {
  const now = new Date();
  const storedNotes = getStoredNotes();
  const storedMessage = getStoredChristmasMessage();
  
  for (let i = 0; i < EVENT_CONFIG.durationDays; i++) {
    const currentDay = EVENT_CONFIG.day + i;

    // Construct an ISO 8601 Date String with Timezone
    const pad = (n: number) => n.toString().padStart(2, '0');
    const monthStr = pad(EVENT_CONFIG.month + 1);
    const dayStr = pad(currentDay);
    const hourStr = pad(EVENT_CONFIG.hour);
    const minStr = pad(EVENT_CONFIG.minute);
    
    const isoDateString = `${EVENT_CONFIG.year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:00${EVENT_CONFIG.timezoneOffset}`;
    const targetDate = new Date(isoDateString);
    
    const eventEnd = new Date(targetDate);
    eventEnd.setHours(targetDate.getHours() + EVENT_CONFIG.eventWindowHours);

    // If "now" is before the end of this event instance
    if (now < eventEnd) {
      const monthName = targetDate.toLocaleString('pt-BR', { month: 'long' });
      const monthFormatted = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      const dayLabel = `${ORDINAL_DAYS[i]} dia da Novena`;
      const displayTitle = `${EVENT_CONFIG.defaultTitle}`; // Title remains generic, subtitle changes

      return {
        title: displayTitle,
        dayLabel: dayLabel,
        dayIndex: i,
        targetDate: targetDate,
        description: EVENT_CONFIG.defaultDescription,
        notes: storedNotes[i] || "",
        christmasMessage: storedMessage || undefined,
        isFinished: false
      };
    }
  }

  // Event is over
  return {
    title: "Evento Encerrado",
    dayLabel: "Feliz Natal!",
    dayIndex: -1,
    // Default to a date in the past
    targetDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    description: "A Novena foi finalizada. Obrigado pela presença!",
    christmasMessage: storedMessage || undefined,
    isFinished: true
  };
};

const App: React.FC = () => {
  // Initialize Admin State
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdminVisible(true);
    }
  }, []);

  const handleSecretClick = () => {
    setSecretClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) { // Trigger after 3 clicks
        setIsAdminVisible(true);
        return 0;
      }
      return newCount;
    });
  };

  // Initialize Event State
  const [isManualOverride, setIsManualOverride] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('eventLink_isManual') === 'true';
    }
    return false;
  });

  const [eventData, setEventData] = useState<EventData>(() => {
    // Try to recover manual data from storage
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('eventLink_manualData');
      const isManual = localStorage.getItem('eventLink_isManual') === 'true';
      
      // Always merge with latest stored message
      const storedMessage = getStoredChristmasMessage();

      if (storedData && isManual) {
        try {
          const parsed = JSON.parse(storedData);
          return {
            ...parsed,
            targetDate: new Date(parsed.targetDate),
            christmasMessage: storedMessage || parsed.christmasMessage
          };
        } catch (e) {
          console.error("Failed to parse stored event data", e);
        }
      }
    }

    // Default to auto-calculated state
    const calculatedState = calculateEventState();
    return {
      title: calculatedState.title,
      dayLabel: calculatedState.dayLabel,
      dayIndex: calculatedState.dayIndex,
      targetDate: calculatedState.targetDate,
      description: calculatedState.description,
      notes: calculatedState.notes,
      christmasMessage: calculatedState.christmasMessage,
      pdfUrl: EVENT_CONFIG.pdfUrl,
      fileName: EVENT_CONFIG.fileName,
      isFinished: calculatedState.isFinished
    };
  });

  // Calculate Christmas Date (Dec 25 of the event year)
  const christmasDate = new Date(`${EVENT_CONFIG.year}-12-25T00:00:00${EVENT_CONFIG.timezoneOffset}`);

  // Timer to update the event day automatically
  useEffect(() => {
    // We run this even in manual override to fetch background updates like new messages if needed,
    // though the setEventData logic below protects manual fields.
    const checkInterval = setInterval(() => {
      const newState = calculateEventState();
      
      setEventData(prev => {
        // If we have a new message from storage that differs from state, update it
        const hasNewMessage = newState.christmasMessage !== prev.christmasMessage;

        if (isManualOverride) {
           // In manual mode, only update if there is a new global message
           if (hasNewMessage) {
             return { ...prev, christmasMessage: newState.christmasMessage };
           }
           return prev;
        }

        // Only update if something critical changed
        if (prev.dayIndex !== newState.dayIndex || prev.isFinished !== newState.isFinished || hasNewMessage) {
          return {
            ...prev,
            title: newState.title,
            dayLabel: newState.dayLabel,
            dayIndex: newState.dayIndex,
            targetDate: newState.targetDate,
            description: newState.description,
            notes: newState.notes,
            christmasMessage: newState.christmasMessage,
            isFinished: newState.isFinished
          };
        }
        return prev;
      });
    }, 5000); // Check every 5s for smoother message updates

    return () => clearInterval(checkInterval);
  }, [isManualOverride]);

  // Handle updates from the Setup Modal
  const handleUpdate = (newData: EventData | null) => {
    if (newData === null) {
      // RESET to Automatic
      setIsManualOverride(false);
      localStorage.removeItem('eventLink_isManual');
      localStorage.removeItem('eventLink_manualData');
      
      const autoState = calculateEventState();
      setEventData(prev => ({
        ...prev, 
        ...autoState,
        pdfUrl: EVENT_CONFIG.pdfUrl,
        fileName: EVENT_CONFIG.fileName
      }));
    } else {
      // Save notes if present and we have a valid day index
      if (newData.dayIndex !== undefined && newData.dayIndex >= 0 && newData.notes !== undefined) {
        const currentNotes = getStoredNotes();
        currentNotes[newData.dayIndex] = newData.notes;
        localStorage.setItem('novena_notes_history', JSON.stringify(currentNotes));
      }

      // SET Manual Override
      setEventData(newData);
      setIsManualOverride(true);
      localStorage.setItem('eventLink_isManual', 'true');
      localStorage.setItem('eventLink_manualData', JSON.stringify(newData));
    }
  };

  // --- AI GENERATION LOGIC ---
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateChristmasMessage = async () => {
    if (!process.env.API_KEY) {
      alert("API Key não configurada.");
      return;
    }

    setIsGenerating(true);
    const notesHistory = getStoredNotes();
    
    // SORT notes to ensure Day 1 comes before Day 2, etc.
    const notesText = Object.entries(notesHistory)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) 
      .map(([index, note]) => `Dia ${parseInt(index) + 1}: ${note}`)
      .join("\n\n");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você está escrevendo uma mensagem de Natal emocionante e calorosa para uma comunidade. 
        
        Aqui estão as anotações e reflexões feitas durante os dias da Novena de Natal:
        --------------------------
        ${notesText}
        --------------------------
        
        INSTRUÇÕES:
        1. Escreva um resumo inspirador que conecte os temas.
        2. Certifique-se de considerar O CONTEÚDO DE CADA DIA fornecido para criar uma narrativa coesa. Não ignore nenhuma reflexão.
        3. Termine com uma mensagem final de Feliz Natal.
        4. O tom deve ser amigável, emocionante e adequado para leitura em público (como em uma igreja ou grupo familiar).
        5. Use Markdown para formatação básica (negrito).`,
      });
      
      setGeneratedSummary(response.text);
    } catch (error) {
      console.error("Erro ao gerar mensagem:", error);
      alert("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMessage = () => {
    if (generatedSummary) {
      localStorage.setItem('novena_christmas_message', generatedSummary);
      setEventData(prev => ({ ...prev, christmasMessage: generatedSummary }));
      setGeneratedSummary(null); // Close modal
      alert("Mensagem salva e publicada com sucesso!");
    }
  };

  const handleShare = async () => {
    const url = window.location.origin + window.location.pathname;
    
    const shareData = {
      title: eventData.title,
      text: `${eventData.dayLabel} - ${eventData.title}. \n${eventData.description}`,
      url: url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copiado! Cole no WhatsApp para convidar seus amigos.');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-yellow-400 text-black p-4 z-[100] font-bold">
        Pular para o conteúdo principal
      </a>

      <CountdownTimer 
        targetDate={eventData.targetDate} 
        title={eventData.title}
        christmasDate={christmasDate}
      />

      <main id="main-content" className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        <section className="mb-12 bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <Info className="w-8 h-8 md:w-10 md:h-10 text-accessible-blue shrink-0 mt-1 hidden md:block" />
            <div className="flex-grow w-full">
               <div className="flex items-center gap-2 mb-2">
                 <Info className="w-6 h-6 text-accessible-blue md:hidden" />
                 <span className="inline-block bg-blue-100 text-accessible-blue px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                   {eventData.dayLabel || "Evento Especial"}
                 </span>
               </div>
               
               <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                {eventData.title}
              </h1>
              <p className="text-xl md:text-2xl text-slate-700 leading-relaxed font-medium mb-8">
                {eventData.description}
              </p>

              {/* Display Daily Notes if available */}
              {eventData.notes && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-r-lg">
                  <h3 className="text-lg font-bold text-yellow-800 mb-2 flex items-center gap-2">
                    <MessageCircleHeart className="w-5 h-5" />
                    Reflexão do Dia
                  </h3>
                  <p className="text-lg text-slate-800 italic">
                    "{eventData.notes}"
                  </p>
                </div>
              )}

              <button 
                onClick={handleShare}
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                aria-label="Compartilhar evento com amigos"
              >
                <Share2 className="w-6 h-6" />
                Convidar Amigos
              </button>
            </div>
          </div>
        </section>

        {/* --- PUBLIC CHRISTMAS MESSAGE SECTION --- */}
        {eventData.christmasMessage && (
          <section aria-label="Mensagem de Natal à Comunidade" className="mb-12 animate-fade-in">
             <div className="bg-red-50 border-4 border-red-200 rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-lg">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Gift className="w-32 h-32 text-red-600" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-red-100 p-3 rounded-full">
                      <Gift className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-red-800">Mensagem Especial de Natal</h2>
                  </div>
                  
                  <div className="prose prose-lg prose-slate text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                    {eventData.christmasMessage}
                  </div>
                </div>
             </div>
          </section>
        )}

        <section aria-label="Downloads de Documentos">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-1 flex-grow bg-slate-200 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-500 uppercase tracking-widest">Documentos</h2>
            <div className="h-1 flex-grow bg-slate-200 rounded-full"></div>
          </div>
          
          <PdfViewer pdfUrl={eventData.pdfUrl} fileName={eventData.fileName} />
        </section>
      </main>

      {/* Generated Summary Modal (Admin Preview) */}
      {generatedSummary && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 shadow-2xl relative animate-fade-in flex flex-col">
            <button 
              onClick={() => setGeneratedSummary(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-black"
            >
              <span className="sr-only">Fechar</span>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex flex-col items-center mb-6 shrink-0">
              <MessageCircleHeart className="w-16 h-16 text-purple-500 mb-4" />
              <h2 className="text-3xl font-bold text-center text-slate-900">Prévia da Mensagem</h2>
              <p className="text-slate-500 mt-2 text-center">Revise o texto abaixo. Se gostar, clique em "Salvar e Publicar" para exibir na página principal.</p>
            </div>
            
            <div className="flex-grow overflow-y-auto bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <div className="prose prose-lg prose-slate text-slate-700 leading-relaxed whitespace-pre-line">
                {generatedSummary}
              </div>
            </div>

            <div className="shrink-0 flex flex-col md:flex-row gap-3">
               <button
                  onClick={handleSaveMessage}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
               >
                 <Save className="w-5 h-5" />
                 Salvar e Publicar
               </button>
               <button
                  onClick={() => setGeneratedSummary(null)}
                  className="w-full md:w-auto px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
               >
                 Cancelar
               </button>
            </div>
          </div>
        </div>
      )}

      <SetupModal 
        onSave={handleUpdate} 
        currentData={eventData} 
        showTrigger={isAdminVisible}
        isManualOverride={isManualOverride}
        onGenerateSummary={generateChristmasMessage}
        isGeneratingSummary={isGenerating}
      />
      
      <footer 
        className="mt-12 py-8 text-center text-slate-500 text-sm md:text-base border-t border-slate-200 select-none"
      >
        <p className="mb-2 text-slate-600 font-medium">✨ Feliz Natal para você e sua família! ✨</p>
        <p onClick={handleSecretClick} className="cursor-pointer inline-block">
          Projetado para acessibilidade e facilidade de uso.
        </p>

        {/* Visible Admin Link */}
        <div className="mt-4">
           <button 
             onClick={() => setIsAdminVisible(true)}
             className="text-slate-300 hover:text-slate-500 text-xs transition-colors underline"
           >
             Gerenciar Evento
           </button>
        </div>

        {secretClickCount > 0 && secretClickCount < 3 && (
           <span className="text-xs text-slate-300 block mt-2">...</span>
        )}
      </footer>
    </div>
  );
};

export default App;