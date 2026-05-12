import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot } from 'lucide-react';
import { sendMessageToAI } from '../api';

const FloatingChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Bonjour ! Je suis votre Assistant IA MAN. Je connais vos commandes et vos fournisseurs. Comment puis-je vous aider ?", sender: 'ai' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue.trim();
        setInputValue('');
        
        // Add user message
        setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
        
        setIsTyping(true);
        
        try {
            const response = await sendMessageToAI(userText);
            setMessages(prev => [...prev, { id: Date.now() + 1, text: response.data.reply, sender: 'ai' }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Impossible de contacter l'IA pour le moment.", sender: 'ai' }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed', bottom: '2rem', right: '2rem',
                    width: '60px', height: '60px', borderRadius: '50%',
                    backgroundColor: 'var(--color-primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.5)',
                    cursor: 'pointer', border: 'none', zIndex: 1000,
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Bot size={28} />
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            width: '360px', height: '500px', maxHeight: '80vh',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: '1.25rem', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
            zIndex: 1000, overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '50%' }}>
                        <Bot size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Assistant MAN IA</h4>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 6, height: 6, backgroundColor: '#10b981', borderRadius: '50%' }}></span> En ligne
                        </span>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.7 }}>
                    <X size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: '0.75rem 1rem',
                        borderRadius: msg.sender === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                        backgroundColor: msg.sender === 'user' ? 'var(--color-primary)' : '#f1f5f9',
                        color: msg.sender === 'user' ? 'white' : 'var(--color-text-main)',
                        fontSize: '0.875rem',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5
                    }}>
                        {msg.text}
                    </div>
                ))}
                
                {isTyping && (
                    <div style={{
                        alignSelf: 'flex-start', backgroundColor: '#f1f5f9', padding: '0.75rem 1rem',
                        borderRadius: '1rem 1rem 1rem 0', fontSize: '0.875rem', display: 'flex', gap: '4px'
                    }}>
                        <span className="typing-dot" style={{ animation: 'bounce 1s infinite' }}>●</span>
                        <span className="typing-dot" style={{ animation: 'bounce 1s infinite 0.2s' }}>●</span>
                        <span className="typing-dot" style={{ animation: 'bounce 1s infinite 0.4s' }}>●</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', backgroundColor: 'white' }}>
                <input 
                    type="text"
                    placeholder="Posez votre question..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    style={{
                        flex: 1, border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)',
                        padding: '0.625rem 0.75rem', fontSize: '0.875rem', outline: 'none'
                    }}
                />
                <button type="submit" style={{
                    backgroundColor: 'var(--color-primary)', color: 'white', border: 'none',
                    borderRadius: 'var(--radius-md)', width: '40px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    <Send size={18} />
                </button>
            </form>

            {/* Small internal CSS just for bounce animation in this demo snippet */}
            <style>{`
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
            `}</style>
        </div>
    );
};

export default FloatingChat;
