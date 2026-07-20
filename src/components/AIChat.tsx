import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { aiApi } from '../api/client';
import type { ChatMessage } from '../store/appStore';

const genId = () => Math.random().toString(36).slice(2);

function ReactMarkdown({ content }: { content: string }) {
  const html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:1px 5px;border-radius:4px;font-family:DM Mono,monospace;font-size:0.9em;">$1</code>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function AIChat() {
  const { showAIChat, setShowAIChat, selectedLocation, chatMessages, addChatMessage, setChatLoading, isChatLoading, sessionId, activeQueryResults } = useAppStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const send = async () => {
    const text = input.trim();
    if (!text || isChatLoading) return;
    setInput('');

    const userMsg: ChatMessage = { id: genId(), role: 'user', content: text, timestamp: Date.now() };
    addChatMessage(userMsg);
    setChatLoading(true);

    try {
      const res = await aiApi.chat({
        message: text,
        session_id: sessionId,
        location_lat: selectedLocation?.lat,
        location_lng: selectedLocation?.lng,
        location_name: selectedLocation?.name,
        context: activeQueryResults ? {
          query_type: activeQueryResults.query_type,
          results_count: activeQueryResults.features.filter(f => f.geometry.type === 'Point').length,
        } : undefined,
      });
      const aiMsg: ChatMessage = { id: genId(), role: 'assistant', content: res.response, timestamp: Date.now() };
      addChatMessage(aiMsg);
    } catch (err: unknown) {
      let errMsg = "Sorry, I couldn't connect to the AI service.";
      if (err instanceof Error) {
        // Try to extract FastAPI detail message
        const match = err.message.match(/"detail":"([^"]+)"/);
        if (match) errMsg = `⚠️ ${match[1]}`;
        else if (err.message.includes('503')) errMsg = '⚠️ AI service unavailable. Check your GEMINI_API_KEY in backend/.env';
        else if (err.message.includes('500')) errMsg = '⚠️ AI error — check backend logs for details.';
        else errMsg = `⚠️ ${err.message}`;
      }
      addChatMessage({ id: genId(), role: 'assistant', content: errMsg, timestamp: Date.now() });
    } finally {
      setChatLoading(false);
    }
  };

  const QUICK = [
    'What businesses are in this area?',
    'Analyze the competition density',
    'Recommend a business location',
    'Explain PostGIS buffer zones',
  ];

  const ui = (
    <>
      {/* Floating bubble — z-index 9999 always above Leaflet (max ~1000) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAIChat(!showAIChat)}
        style={{
          position: 'fixed', bottom: 28, right: 28, width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(245,158,11,0.45)', zIndex: 9999,
        }}
        className={showAIChat ? '' : 'glow-pulse'}>
        <AnimatePresence mode="wait">
          {showAIChat ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window — z-index 9998 */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              position: 'fixed', bottom: 96, right: 28, width: 380, maxHeight: '70vh',
              background: 'var(--bg1)', border: '1px solid var(--border-accent)',
              borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
              display: 'flex', flexDirection: 'column', zIndex: 9998, overflow: 'hidden',
            }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.2 8 13 8 13s8-7.8 8-13a8 8 0 0 0-8-8z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Bizby AI</div>
                <div style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                  Gemini 2.0 · Geospatial
                </div>
              </div>
              {selectedLocation && (
                <div style={{ marginLeft: 'auto', padding: '3px 8px', background: 'var(--accent-glow)', border: '1px solid var(--accent-border)', borderRadius: 99, fontSize: 10, color: 'var(--accent)' }}>
                  📍 {selectedLocation.name}
                </div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMessages.length === 0 && (
                <div>
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🌍</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Ask me anything about locations</div>
                    <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>Powered by Gemini 2.0 + PostGIS</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {QUICK.map((q) => (
                      <button key={q} type="button" onClick={() => { setInput(q); }}
                        style={{
                          padding: '8px 12px', borderRadius: 8, background: 'var(--bg3)',
                          border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 12,
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 13px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg3)',
                    color: msg.role === 'user' ? '#000' : 'var(--text2)',
                    fontSize: 13, lineHeight: 1.5, border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  }}>
                    <ReactMarkdown content={msg.content} />
                  </div>
                </motion.div>
              ))}

              {isChatLoading && (
                <div style={{ display: 'flex', gap: 5, padding: '8px 12px', background: 'var(--bg3)', borderRadius: '12px 12px 12px 4px', width: 'fit-content', border: '1px solid var(--border)' }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
                      animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about this location..."
                style={{
                  flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  color: 'var(--text1)', fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent-border)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={send} disabled={!input.trim() || isChatLoading}
                style={{
                  width: 36, height: 36, borderRadius: 8, background: input.trim() ? 'var(--accent)' : 'var(--bg3)',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#000' : 'var(--text4)'} strokeWidth="2.5">
                  <path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // Portal to document.body — escapes Leaflet/Framer stacking contexts entirely
  return createPortal(ui, document.body);
}

