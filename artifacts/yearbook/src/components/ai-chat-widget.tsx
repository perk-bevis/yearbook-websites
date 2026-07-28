import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETINGS = [
  'Xin chào! Mình là trợ lý AI của Kỷ Yếu 9A 🎓',
  'Bạn cần mình giúp gì nào? Mình có thể gợi ý lời ngỏ, kể chuyện kỷ niệm, hoặc trả lời câu hỏi về trang web nhé!',
];

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETINGS[0] },
    { role: 'assistant', content: GREETINGS[1] },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [dots, setDots] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Blinking dots animation
  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setDots(d => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, [streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setStreaming(true);

    // Add empty assistant message to stream into
    const assistantIdx = history.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`${BASE}api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Network error');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.content) {
              setMessages(prev =>
                prev.map((m, i) =>
                  i === assistantIdx ? { ...m, content: m.content + evt.content } : m
                )
              );
            }
            if (evt.error) {
              setMessages(prev =>
                prev.map((m, i) =>
                  i === assistantIdx ? { ...m, content: 'Xin lỗi, mình gặp lỗi rồi. Bạn thử lại nhé!' } : m
                )
              );
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map((m, i) =>
          i === assistantIdx ? { ...m, content: 'Không kết nối được với AI. Bạn thử lại sau nhé!' } : m
        )
      );
    }
    setStreaming(false);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary/90 transition-colors group"
            title="Chat với AI"
          >
            <MessageCircle className="w-6 h-6" />
            {/* Ping animation */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: 'min(520px, calc(100dvh - 3rem))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5 shrink-0">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Trợ lý AI Kỷ Yếu</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                  Đang hoạt động
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-muted/60 text-foreground rounded-tl-sm'
                      : 'bg-primary text-white rounded-tr-sm'
                  }`}>
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="text-muted-foreground">{'...'.slice(0, dots + 1)}</span>
                    ) : null)}
                  </div>
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1 items-center">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                        animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Nhắn tin với AI..."
                  className="flex-1 bg-muted/30 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  disabled={streaming}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming}
                  className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Nhấn Enter để gửi</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
