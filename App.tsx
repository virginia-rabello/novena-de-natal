import React, { useState, useEffect, useCallback } from 'react';
import CountdownTimer from './components/CountdownTimer';
import PdfViewer from './components/PdfViewer';
import SetupModal from './components/SetupModal';
import { EventData } from './types';
import { Info, Share2, MessageCircleHeart, Save, Gift, BookOpen } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION AREA (EDIT THIS FOR EVERYONE) ---
const EVENT_CONFIG = {
  // 1. Event Date & Time (Start of the first day)
  year: 2025,
  month: 11,     // Note: 0 = January, 11 = December
  day: 15,       // Day of the month
  hour: 20,      // 24-hour format (20 = 8 PM)
  minute: 30,    // Minute
  
  // Timezone Offset (Important for global sync)
  timezoneOffset: "-03:00", 
  
  // 2. Event Details
  defaultTitle: "Novena de Natal 2025",
  defaultDescription: "Bem-vindos. Participe da video chamada no Whatsapp e baixe o folheto para rezar conosco.",
  
  // 3. File / PDF Details
  // IMPORTANT: This must be a path to a file in the public folder or a full URL.
  pdfUrl: "https://drive.google.com/file/d/1uIPXcjDKpkKRQrn9HZg9uR6RCg_SfwL-/view?usp=sharing", 
  fileName: "Folheto_Novena_2025.pdf",

  // 4. Advanced Logic
  durationDays: 9, 
  eventDurationMinutes: 30 // Duration of each event in minutes
};
// ---------------------------------------------------

const ORDINAL_DAYS = [
  "Primeiro", "Segundo", "Terceiro", "Quarto", "Quinto", 
  "Sexto", "Sétimo", "Oitavo", "Nono"
];

// --- DAILY NOTES REPOSITORY ---
// Add new summaries here as the days pass.
const DEFAULT_NOTES: Record<number, string> = {
  // Day 0 (15/12)
  0: "Hoje refletimos sobre fé e disponibilidade para Deus, inspirados pelo 'sim' de Maria e sua confiança plena. Discutimos que estar disponível significa priorizar o compromisso com Deus acima de futilidades e cultivar a gratidão constante para sentir Sua presença. Relembramos que, com uma fé do tamanho de uma semente de mostarda, podemos mover montanhas, e concluímos sobre a importância de entregar todas as nossas preocupações a Ele, confiando em Sua vontade.",
  
  // Day 1 (16/12)
  1: "No segundo dia, refletimos sobre o silêncio necessário para ouvir a Deus, inspirados pela confiança de São José. Enquanto o groupo destacou a oração em retiro, acrescentamos que o silêncio vai além da ausência de barulho: é a quietude interior. Assim como José, que não se deixou levar pelo julgamento ou rancor ao saber de Maria, silenciar significa acalmar pensamentos negativos e ruídos internos. É essa pureza de espírito que nos torna capazes de discernir a voz divina e os sinais de Deus em nossa vida.",

  // Day 2 (17/12)
  2: "A visita de Maria a Isabel nos ensina que a fé autêntica se traduz em movimento e serviço prático. Assim como Maria partiu para cuidar, vemos a beleza de Deus no cuidado dedicado de uma filha à sua mãe idosa, no apoio essencial de uma mãe que chega em um momento difícil, de duas irmãs se apoiando na caminhada da vida. Seja através de um abraço, de uma mensagem de bom dia ou da nossa Novena de Natal, somos chamados a ser presença de consolo. Ao celebrarmos as vitórias uns dos outros, compreendemos que o amor se manifesta nos pequenos gestos e que, para Deus, o impossível é apenas o começo da nossa caminhada de apoio mútuo.",

  // Day 3 (18/12)
  3: "A jornada de Maria e José rumo a Belém demonstra que a fé não é ausência de incertezas, mas a coragem de caminhar sob a Providência Divina. Assim como eles enfrentaram o inesperado with obediência, a discussão nos levou a refletir sobre a gestão da ansiedade e a nossa ilusão de controle, aceitando que muitos caminhos já estão traçados por um propósito maior. A memória das ondas do mar, que parecem gigantes de longe mas se tornam superáveis quando chegam perto, ilustra que Deus nos concede a força exata para o momento presente. Que possamos confiar que, mesmo nos caminhos mais desafiadores, o propósito de Deus nos guia, transformando cada dificuldade em um sinal de Sua presença e cada medo em uma vitória vencida pela confiança.",

  // Day 4 (19/12)
  4: "Jesus entrou no mundo na simplicidade de uma manjedoura, nos ensinando que a verdadeira alegria não nasce do consumo, mas do amor partilhado. Em nossa casa, sentimos que Deus não é uma figura distante; Ele é íntimo, um membro querido da nossa família com quem conversamos e caminhamos lado a lado. Assim como Maria acolheu Jesus com entrega nós O acolhemos quando priorizamos o que é essencial. Aprendemos que nenhum bem material ou sucesso profissional vale mais do que a presença e a união daqueles que amamos. A verdadeira felicidade está na simplicidade de estarmos juntos, pois é nos pequenos gestos de carinho e na vida compartilhada que a luz de Jesus realmente brilha em nós.",

  // Day 5 (20/12)
  5: "O anúncio da salvação não aconteceu em palácios, mas no cotidiano simples de pastores que, mesmo temerosos, mantiveram o coração aberto para acolher e obedecer ao chamado divino. Essa prontidão dos pastores nos recorda que a alegria de ter Jesus em nossas vidas não deve ser guardada, mas partilhada com pressa e entusiasmo. Na nossa caminhada, essa partilha se manifesta na beleza da nossa Novena de Natal, um gesto humilde que planta sementes de fé nas próximas gerações e mantém Jesus presente no seio de nossas famílias. Compreendemos que propagar a luz é, acima de tudo, viver os ensinamentos de Cristo através da empatia, do amor ao próximo e da capacidade de oferecer a outra face, desejando que toda a humanidade se encontre no respeito mútuo. Que a nossa vida seja um reflexo desse encontro com o Menino Jesus, espalhando Sua luz não apenas com palavras, mas com gestos concretos de acolhimento e ternura, transformando nossa rotina em um anúncio constante de esperança.",
};

// Helper to get notes from storage
const getStoredNotes = (): Record<number, string> => {
  if (typeof window === 'undefined') return DEFAULT_NOTES;
  try {
    const stored = JSON.parse(localStorage.getItem('novena_notes_history') || '{}');
    return { ...DEFAULT_NOTES, ...stored };
  } catch {
    return DEFAULT_NOTES;
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
    
    // Robust calculation using timestamps to avoid edge cases with setMinutes
    // Adds minutes converted to milliseconds
    const eventEnd = new Date(targetDate.getTime() + (EVENT_CONFIG.eventDurationMinutes * 60 * 1000));

    // If "now" is before the end of this event instance (Timestamp comparison)
    if (now.getTime() < eventEnd.getTime()) {
      const monthName = targetDate.toLocaleString('pt-BR', { month: 'long' });
      // const monthFormatted = monthName.charAt(0).toUpperCase() + monthName.slice(1); // Unused
      
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
    
    // Check if we have notes
    const validNotes = Object.entries(notesHistory)
      .filter(([_, note]) => note && note.trim().length > 10); // Simple filter for valid content

    if (validNotes.length === 0) {
      alert("Adicione anotações nos dias da novena antes de gerar a mensagem.");
      setIsGenerating(false);
      return;
    }

    // SORT notes to ensure Day 1 comes before Day 2, etc.
    const notesText = validNotes
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) 
      .map(([index, note]) => {
        const dayNum = parseInt(index);
        return `Dia ${dayNum + 1} (${ORDINAL_DAYS[dayNum]}): ${note}`;
      })
      .join("\n\n");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é um assistente litúrgico ajudando a escrever uma Mensagem de Natal de encerramento para uma Novena.
        
        CONTEXTO:
        Realizamos uma jornada de oração de 9 dias. Abaixo estão os resumos das reflexões espirituais feitas em cada dia.
        
        CAMINHADA ESPIRITUAL (RESUMOS):
        --------------------------
        ${notesText}
        --------------------------
        
        INSTRUÇÕES DE ESCRITA:
        1. **Crie uma Narrativa Coesa**: Não faça apenas uma lista. Escreva um texto fluido que mostre como começamos (Dia 1) e como crescemos espiritualmente até o final.
        2. **Conecte os Temas**: Encontre o fio condutor entre os resumos fornecidos (ex: como a fé do primeiro dia levou à esperança do último).
        3. **Referencie os Conteúdos**: Cite brevemente os ensinamentos específicos mencionados nos resumos para que a comunidade se lembre do que viveu.
        4. **Tom de Voz**: Pastoral, acolhedor, emocionante e solene. Deve soar como um padre ou líder comunitário falando com carinho.
        5. **Conclusão**: Termine desejando um Santo e Feliz Natal, celebrando o nascimento de Jesus.
        
        Formatação: Use Markdown (negrito para destacar sentimentos ou palavras-chave).`,
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

  const availableNotes = Object.entries(getStoredNotes())
    .filter(([_, note]) => note && note.trim().length > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

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

              {/* Display Current Featured Note */}
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

        {/* --- DAILY SUMMARY DIARY SECTION --- */}
        {availableNotes.length > 0 && (
          <section aria-label="Diário da Novena" className="mb-12 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
               <div className="h-1 flex-grow bg-slate-200 rounded-full"></div>
               <h2 className="text-2xl font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Caminhada Diária
               </h2>
               <div className="h-1 flex-grow bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="space-y-6">
              {availableNotes.map(([dayIndexStr, note]) => {
                    const i = Number(dayIndexStr);
                    return (
                       <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex gap-4 transition-all hover:shadow-md hover:border-slate-200">
                          <div className="shrink-0 hidden md:block">
                             <div className="bg-yellow-100 text-yellow-700 font-bold rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-inner border border-yellow-200">
                               {i + 1}º
                             </div>
                          </div>
                          <div>
                             <h3 className="font-bold text-slate-900 text-lg mb-2 flex items-center gap-2">
                                <span className="md:hidden bg-yellow-100 text-yellow-700 rounded-full w-8 h-8 flex items-center justify-center text-sm border border-yellow-200">{i + 1}º</span>
                                {ORDINAL_DAYS[i] || `Dia ${i+1}`}
                             </h3>
                             <p className="text-slate-700 leading-relaxed whitespace-pre-line text-lg">{note}</p>
                          </div>
                       </div>
                    );
              })}
            </div>
          </section>
        )}

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
        <div className="mt-4 flex flex-col items-center gap-2">
           <button 
             onClick={() => setIsAdminVisible(true)}
             className="text-slate-300 hover:text-slate-500 text-xs transition-colors underline"
           >
             Gerenciar Evento
           </button>
           
           {isManualOverride && (
             <div className="mt-2">
               <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-300">
                 ⚠ Modo Manual Ativo
               </span>
               <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                 As configurações automáticas de data/hora estão pausadas. Use o botão "Gerenciar Evento" {'>'} "Restaurar Automático" para voltar à programação normal.
               </p>
             </div>
           )}
        </div>

        {secretClickCount > 0 && secretClickCount < 3 && (
           <span className="text-xs text-slate-300 block mt-2">...</span>
        )}
      </footer>
    </div>
  );
};

export default App;