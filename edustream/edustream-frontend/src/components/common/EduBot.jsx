import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchAPI } from '../../services/api.js';

export default function EduBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: "Hi! I'm EduBot 🤖. I can help you find courses, or answer questions about the platform. What do you want to learn today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsg }]);
    setIsTyping(true);

    // Simulate network delay and call AI
    try {
      const allMessages = [...messages, { id: Date.now(), sender: 'user', text: userMsg }];
      const response = await searchAPI.chat(allMessages.map(m => ({ sender: m.sender, text: m.text })));
      
      const botResponse = { 
        id: Date.now() + 1, 
        sender: 'bot', 
        text: response.data?.data?.text || "I'm sorry, I couldn't process that." 
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      const botResponse = { 
        id: Date.now() + 1, 
        sender: 'bot', 
        text: `Error connecting to AI: ${errorMessage}. Please check the API key in the .env file.` 
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 60, height: 60, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, var(--indigo-dark), var(--indigo))',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(79, 70, 229, 0.4)', cursor: 'pointer',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isOpen ? 'scale(0)' : 'scale(1)', opacity: isOpen ? 0 : 1
        }}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Window */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
        width: 380, height: 500, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 48px)',
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 20, boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s',
        transformOrigin: 'bottom right',
        transform: isOpen ? 'scale(1)' : 'scale(0.8)', opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', background: 'linear-gradient(135deg, var(--indigo-dark), var(--indigo))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 }}>
              <Bot size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 600 }}>EduBot</h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0 }}>AI Assistant</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
          background: 'var(--navy-800)', backdropFilter: 'blur(10px)'
        }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '12px 16px', fontSize: '0.9rem', lineHeight: 1.5,
                background: msg.sender === 'user' ? 'var(--indigo)' : 'var(--navy-600)',
                color: '#fff',
                borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border)'
              }}>
                {msg.text}
              </div>
              
              {/* Render Course Recommendations if any */}
              {msg.courses && msg.courses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, width: '85%' }}>
                  {msg.courses.map(course => (
                    <Link key={course._id} to={`/courses/${course._id}`} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
                      <div className="card hoverable" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--indigo)', background: 'var(--navy)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--indigo-dark)', flexShrink: 0, overflow: 'hidden' }}>
                          {course.thumbnail?.url && <img src={course.thumbnail.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                            {course.title}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--gold)', margin: 0 }}>★ {course.rating || 0}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                padding: '14px 16px', background: 'var(--navy-600)', borderRadius: '16px 16px 16px 4px',
                border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center'
              }}>
                <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: '50%', animation: 'typing 1.4s infinite 0s' }} />
                <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: '50%', animation: 'typing 1.4s infinite 0.2s' }} />
                <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: '50%', animation: 'typing 1.4s infinite 0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{ padding: 16, background: 'var(--card-bg)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 24, border: '1px solid var(--border)',
              background: 'var(--navy-800)', color: 'var(--lavender)', fontSize: '0.9rem', outline: 'none'
            }}
          />
          <button type="submit" disabled={!input.trim() || isTyping} style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: input.trim() && !isTyping ? 'var(--indigo)' : 'var(--navy-600)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed', transition: 'background 0.2s'
          }}>
            <Send size={18} style={{ marginLeft: -2, marginTop: 2 }} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
