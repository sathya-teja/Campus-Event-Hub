import { useState, useEffect, useRef } from "react";
import { sendChatMessage } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Minimize2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Welcome message + focus input
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            sender: "bot",
            text: "Hi there! 👋 I'm your CampusEventHub assistant.\n\nI can help you discover events, check registrations, or answer any campus-related questions. What would you like to know?",
            time: new Date(),
          },
        ]);
      }, 300);
    }
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = { sender: "user", text: message.trim(), time: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setMessage("");

    try {
      const res = await sendChatMessage(userMessage.text);

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: res.data.response, time: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I ran into an issue. Please try again in a moment.",
          time: new Date(),
          isError: true,
        },
      ]);
    }

    setLoading(false);
  };

  const resetChat = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([
        {
          sender: "bot",
          text: "Chat cleared! How can I help you?",
          time: new Date(),
        },
      ]);
    }, 100);
  };

  const formatTime = (date) =>
    date?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const QUICK_PROMPTS = ["Upcoming events", "How to register?", "My registrations"];

  return (
    <>
      {/* ── FLOATING BUTTON ── */}
      <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-25" />
              <button
                onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                className="relative w-13 h-13 w-[52px] h-[52px] sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-300/50 flex items-center justify-center transition-colors duration-200"
                aria-label="Open chat"
              >
                <MessageCircle size={22} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CHAT WINDOW ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "60px" : undefined,
            }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className={`
              fixed z-50 bg-white rounded-2xl shadow-2xl shadow-slate-300/60
              border border-slate-200 flex flex-col overflow-hidden
              /* Mobile: full width with margin, anchored to bottom */
              bottom-0 left-0 right-0 mx-3 mb-3 rounded-2xl
              /* Small screens and up: floating bottom-right */
              sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 sm:mb-0
              sm:w-[380px]
            `}
            style={{
              maxHeight: isMinimized ? "60px" : "calc(100vh - 5rem)",
              /* On mobile cap height so it doesn't cover entire screen */
              height: isMinimized ? "60px" : "min(540px, calc(100vh - 5.5rem))",
            }}
          >
            {/* ── HEADER ── */}
            <div className="bg-blue-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={17} className="text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  CampusEventHub AI
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-blue-100">Online</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={resetChat}
                  className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-blue-100 hover:text-white transition"
                  title="Clear chat"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-blue-100 hover:text-white transition"
                  title="Minimize"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-blue-100 hover:text-white transition"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── BODY ── */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50 min-h-0">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`flex items-end gap-2 ${
                          msg.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {/* Bot avatar */}
                        {msg.sender === "bot" && (
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-1">
                            <Bot size={14} className="text-blue-600" />
                          </div>
                        )}

                        <div className={`flex flex-col gap-1 max-w-[78%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                              msg.sender === "user"
                                ? "bg-blue-600 text-white rounded-br-sm"
                                : msg.isError
                                ? "bg-red-50 text-red-700 border border-red-100 rounded-bl-sm"
                                : "bg-white text-slate-800 border border-slate-100 shadow-sm rounded-bl-sm"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-slate-400 px-1">
                            {formatTime(msg.time)}
                          </span>
                        </div>

                        {/* User avatar */}
                        {msg.sender === "user" && (
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mb-1">
                            <User size={13} className="text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end gap-2"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot size={14} className="text-blue-600" />
                      </div>
                      <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-slate-400"
                            style={{
                              animation: "chatbounce 1.2s infinite",
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick prompts */}
                {messages.length <= 1 && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 flex-wrap flex-shrink-0">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setMessage(prompt);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── INPUT ── */}
                <div className="px-3 py-3 border-t border-slate-100 bg-white flex items-center gap-2 flex-shrink-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || loading}
                    className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send size={15} className={message.trim() ? "" : "opacity-50"} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes chatbounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
};

export default Chatbot;