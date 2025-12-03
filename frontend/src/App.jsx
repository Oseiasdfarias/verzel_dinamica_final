import React, { useState, useRef, useEffect } from 'react';

// --- Ícones SVG ---
const Send = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const Bot = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const User = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const Loader2 = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>
);

// --- Componente Customizado de Markdown (Sem dependências externas) ---
const MarkdownRenderer = ({ content, role }) => {
  if (!content) return null;

  // Renderiza formatação inline (negrito e código inline)
  const renderInline = (text) => {
    // Divide por **negrito** e `código`
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-blue-200">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className={`px-1.5 py-0.5 rounded font-mono text-sm ${
            role === 'user' ? 'bg-blue-700' : 'bg-gray-900/50 border border-white/10'
          }`}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Divide o conteúdo por blocos de código (```)
  const blocks = content.split(/```/);

  return (
    <div className="text-sm sm:text-base space-y-2 break-words">
      {blocks.map((block, index) => {
        // Se for ímpar, é um bloco de código
        if (index % 2 === 1) {
          return (
            <div key={index} className="overflow-x-auto my-2 rounded-lg border border-white/10 bg-black/30 p-3 shadow-inner">
              <code className="font-mono text-xs sm:text-sm whitespace-pre text-gray-200">{block.trim()}</code>
            </div>
          );
        }

        // Se for par, é texto normal (processa linhas)
        return block.split('\n').map((line, lineIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return <div key={`${index}-${lineIdx}`} className="h-1" />;

          // Tratamento para listas
          if (trimmedLine.startsWith('- ')) {
            return (
              <div key={`${index}-${lineIdx}`} className="flex items-start gap-2 ml-1">
                <span className="mt-2 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                <span className="leading-relaxed">{renderInline(trimmedLine.substring(2))}</span>
              </div>
            );
          }

          // Parágrafo normal
          return (
            <p key={`${index}-${lineIdx}`} className="leading-relaxed">
              {renderInline(line)}
            </p>
          );
        });
      })}
    </div>
  );
};

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      text: 'Olá! Sou o assistente virtual do **Rosana Desk**. \n\nComo posso ajudar? Posso formatar:\n- Listas organizadas\n- **Negrito** para destaque\n- `Código` técnico' 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      console.log('Enviando mensagem:', userMessage);
      
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.response);
      }
      
      setMessages([...newMessages, { 
        role: 'ai', 
        text: data.response 
      }]);
      
    } catch (error) {
      console.error("Erro:", error);
      setMessages([...newMessages, { 
        role: 'ai', 
        text: `Erro ao conectar: ${error.message}\n\nVerifique se o backend está rodando em http://127.0.0.1:8000` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Fundo alterado para Dark (gray-900)
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-2 sm:p-4 text-gray-100 font-sans">
      <div className="w-full max-w-3xl h-[100dvh] sm:h-[600px] lg:h-[700px] bg-gray-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        
        {/* Header Dark */}
        <div className="bg-gray-900/80 p-6 shadow-lg border-b border-gray-700 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Bot />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Rosana Desk</h1>
              <p className="text-blue-400 text-sm font-medium">Assistente Virtual</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-800 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 animate-fade-in ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg transition-transform hover:scale-105 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' 
                  : 'bg-gray-700 border border-gray-600 text-blue-400'
              }`}>
                {msg.role === 'user' ? <User /> : <Bot />}
              </div>

              {/* Message Bubble com Renderizador Customizado */}
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 shadow-md overflow-hidden ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-900/20'
                  : 'bg-gray-700 text-gray-100 rounded-tl-sm border border-gray-600 shadow-black/20'
              }`}>
                <MarkdownRenderer content={msg.text} role={msg.role} />
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-start gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-700 border border-gray-600 text-blue-400">
                <Bot />
              </div>
              <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-5 py-3 shadow-md border border-gray-600">
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 />
                  <span className="text-sm font-medium">Digitando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area Dark */}
        <div className="p-4 sm:p-6 bg-gray-900 border-t border-gray-700">
          <div className="flex gap-3 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1 px-5 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-gray-800/80 transition-all text-white placeholder-gray-500 shadow-inner"
              placeholder="Digite sua mensagem..."
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-600/30 flex items-center gap-2 font-medium active:scale-95"
            >
              <Send />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;