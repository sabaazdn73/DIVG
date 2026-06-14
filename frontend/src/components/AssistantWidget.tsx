import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { apiAskAssistant } from '../lib/api';

type Msg = { role: 'user' | 'assistant'; text: string };

const SUGGESTIONS = [
  'What is DIVG?',
  'How does verification work?',
  "What's a VIC?",
  'How is Walrus used here?',
];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [log, setLog] = useState<Msg[]>([
    { role: 'assistant', text: "Hi! I'm the DIVG assistant. Ask me anything about how this platform verifies impact claims on-chain." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log, thinking]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || thinking) return;
    setLog(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setThinking(true);
    try {
      const res = await apiAskAssistant(question);
      setLog(prev => [...prev, { role: 'assistant', text: res.reply || 'No response.' }]);
    } catch {
      setLog(prev => [...prev, { role: 'assistant', text: 'Sorry, I could not reach the assistant right now.' }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {/* Launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm px-4 py-3 rounded-full shadow-[0_0_30px_rgba(45,212,191,0.4)] transition-all"
          aria-label="Open DIVG assistant"
        >
          <Sparkles className="w-4 h-4" /> Ask DIVG
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] w-[92vw] max-w-sm h-[70vh] max-h-[560px] flex flex-col bg-[#141026]/95 backdrop-blur-xl border border-teal-500/30 rounded-2xl shadow-2xl overflow-hidden font-['Inter',sans-serif]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-teal-500/10">
            <div className="flex items-center gap-2 text-teal-300">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold text-sm">DIVG Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {log.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] text-sm leading-relaxed px-3 py-2 rounded-xl ${
                  m.role === 'user'
                    ? 'bg-teal-500 text-black font-medium'
                    : 'bg-white/5 text-gray-200 border border-white/10'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 text-gray-400 text-sm px-3 py-2 rounded-xl">
                  thinking…
                </div>
              </div>
            )}
            {/* Suggestion chips (only before the first user message) */}
            {log.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-[11px] text-teal-300 border border-teal-500/30 hover:bg-teal-500/10 rounded-full px-2.5 py-1 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 p-3 border-t border-white/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about DIVG…"
              className="flex-1 bg-[#1C1633] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button type="submit" disabled={thinking || !input.trim()}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-black p-2 rounded-lg transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
