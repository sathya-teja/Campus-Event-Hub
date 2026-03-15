import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendChatMessage, BASE_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Bot, User, Minimize2,
  RotateCcw, Sparkles, ChevronDown,
  Calendar, MapPin, ExternalLink, Tag,
} from "lucide-react";

/* ══════════════════════════════════════════════
   PARSE EVENTS from AI text
   Pattern: 1. "Title" | Category: X | Location: Y | Start: Z | By: W (College)
══════════════════════════════════════════════ */
function parseEvents(text) {
  const events = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(
      /^\d+\.\s+"([^"]+)"\s*\|\s*Category:\s*([^|]+)\s*\|\s*Location:\s*([^|]+)\s*\|\s*Start:\s*([^|]+?)(?:\s*\|\s*End:\s*([^|]+?))?(?:\s*\|\s*(?:Created|By):\s*(.+))?$/
    );
    if (match) {
      const [, title, category, location, start, end, by] = match;
      events.push({
        title: title.trim(),
        category: category.trim(),
        location: location.trim(),
        date: end ? `${start.trim()} – ${end.trim()}` : start.trim(),
        college: by ? by.replace(/\(.*?\)/, "").trim() : "",
      });
    }
  }
  return events;
}

/* ══════════════════════════════════════════════
   INLINE RENDERER — bold, italic, code
══════════════════════════════════════════════ */
function renderInline(text, isUser = false) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i} className={isUser ? "font-semibold text-white" : "font-semibold text-slate-800"}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part))
      return <code key={i} className="bg-slate-100 text-blue-700 px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

/* ══════════════════════════════════════════════
   EVENT CARD
══════════════════════════════════════════════ */
function EventCard({ event, navigate }) {
  return (
    <div className="mt-1.5 bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 space-y-1">
        <p className="text-xs font-bold text-slate-800 leading-snug">{event.title}</p>
        {event.category && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            <Tag size={9} /> {event.category}
          </span>
        )}
        {event.date && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar size={10} className="text-blue-500 flex-shrink-0" />
            <span>{event.date}</span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin size={10} className="text-blue-500 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
        )}
        {event.college && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Tag size={10} className="text-purple-500 flex-shrink-0" />
            <span>{event.college}</span>
          </div>
        )}
      </div>
      <button
        onClick={() => navigate("/events")}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 py-2 transition-colors"
      >
        <ExternalLink size={10} /> View Events
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN MARKDOWN RENDERER
══════════════════════════════════════════════ */
function BotMessage({ text, navigate }) {
  const events = parseEvents(text);

  const cleanLines = text.split("\n").filter(
    line => !line.match(/^\d+\.\s+"[^"]+"\s*\|\s*Category:/)
  );

  const lines = cleanLines;
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(<div key={`sp${i}`} className="h-1" />);
      i++; continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr${i}`} className="border-slate-100 my-1.5" />);
      i++; continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const txt = line.replace(/^#{1,3}\s/, "");
      elements.push(
        <p key={i} className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mt-2 mb-0.5">
          {txt}
        </p>
      );
      i++; continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const num = lines[i].match(/^(\d+)\./)[1];
        const content = lines[i].replace(/^\d+\.\s/, "");
        items.push(
          <li key={i} className="flex gap-2 items-start text-[13px]">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
              {num}
            </span>
            <span className="flex-1 leading-relaxed text-slate-700">{renderInline(content)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ol${i}`} className="space-y-1.5 my-1.5">{items}</ul>);
      continue;
    }

    if (/^[-•*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i])) {
        items.push(
          <li key={i} className="flex gap-2 items-start text-[13px]">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
            <span className="flex-1 leading-relaxed text-slate-700">{renderInline(lines[i].replace(/^[-•*]\s/, ""))}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul${i}`} className="space-y-1.5 my-1.5">{items}</ul>);
      continue;
    }

    if (/^>\s/.test(line)) {
      elements.push(
        <div key={i} className="border-l-2 border-blue-300 pl-3 py-0.5 my-1 italic text-[12px] text-slate-500">
          {renderInline(line.replace(/^>\s/, ""))}
        </div>
      );
      i++; continue;
    }

    elements.push(
      <p key={i} className="leading-relaxed text-[13px] text-slate-700">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  if (events.length > 0) {
    elements.push(
      <div key="events" className="space-y-2 mt-2">
        {events.map((ev, idx) => (
          <EventCard key={idx} event={ev} navigate={navigate} />
        ))}
      </div>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

/* ══════════════════════════════════════════════
   USER AVATAR — shows profile pic or initial
══════════════════════════════════════════════ */
function UserAvatar({ user }) {
  const [imgErr, setImgErr] = useState(false);

  const src =
    user?.profileImage && !imgErr
      ? user.profileImage.startsWith("http")
        ? user.profileImage
        : `${BASE_URL}/uploads/${user.profileImage}`
      : null;

  return (
    <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 mb-1 border border-white shadow-sm">
      {src ? (
        <img
          src={src}
          alt={user?.name || "User"}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-blue-600 flex items-center justify-center">
          {user?.name
            ? <span className="text-[10px] font-bold text-white leading-none">{user.name[0].toUpperCase()}</span>
            : <User size={11} className="text-white" />
          }
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   CHATBOT
══════════════════════════════════════════════ */
const Chatbot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage]         = useState("");
  const [messages, setMessages]       = useState([]);
  const [loading, setLoading]         = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    setMessages([]);
    setIsOpen(false);
    setIsMinimized(false);
    setMessage("");
  }, [user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        const firstName = user?.name ? `, ${user.name.split(" ")[0]}` : "";
        setMessages([{
          sender: "bot",
          text: `Hi there${firstName}! 👋 I'm your CampusEventHub assistant.\n\nI can help you discover events, answer platform questions, and more. What would you like to know?`,
          time: new Date(),
        }]);
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
      setMessages((prev) => [...prev, { sender: "bot", text: res.data.response, time: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, {
        sender: "bot",
        text: "Sorry, I ran into an issue. Please try again in a moment.",
        time: new Date(),
        isError: true,
      }]);
    }
    setLoading(false);
  };

  const resetChat = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([{ sender: "bot", text: "Chat cleared! How can I help you?", time: new Date() }]);
    }, 100);
  };

  const formatTime = (date) =>
    date?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const QUICK_PROMPTS = user?.role === "college_admin"
    ? ["My events", "Create an event", "Manage participants"]
    : user?.role === "super_admin"
    ? ["Pending admins", "Platform stats", "All users"]
    : ["Upcoming events", "How to register?", "Browse events"];

  const roleLabel = {
    student:       "Student",
    college_admin: "College Admin",
    super_admin:   "Super Admin",
  }[user?.role] || "Guest";

  const roleDot = {
    student:       "bg-emerald-400",
    college_admin: "bg-amber-400",
    super_admin:   "bg-red-400",
  }[user?.role] || "bg-slate-400";

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
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="relative"
            >
              <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white z-10" />
              <button
                onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                className="relative w-[52px] h-[52px] sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full shadow-xl shadow-blue-400/40 flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label="Open chat"
              >
                <MessageCircle size={22} strokeWidth={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CHAT WINDOW ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1, height: isMinimized ? "64px" : undefined }}
            exit={{ opacity: 0, y: 32, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed z-50 flex flex-col overflow-hidden
              bottom-0 left-0 right-0 mx-3 mb-3 rounded-2xl
              sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 sm:mb-0 sm:w-[390px]
              bg-white border border-slate-200/80 shadow-2xl shadow-slate-400/20"
            style={{
              maxHeight: isMinimized ? "64px" : "calc(100vh - 5rem)",
              height:    isMinimized ? "64px" : "min(600px, calc(100vh - 5.5rem))",
            }}
          >
            {/* HEADER */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 relative overflow-hidden">
              <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-8 left-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-600" />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-sm font-semibold text-white leading-tight tracking-tight">CampusEventHub AI</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${roleDot} animate-pulse`} />
                  <span className="text-[11px] text-blue-100 font-medium">{roleLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 relative z-10">
                <button onClick={resetChat} className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-blue-200 hover:text-white transition-all" title="Clear chat">
                  <RotateCcw size={13} />
                </button>
                <button onClick={() => setIsMinimized(!isMinimized)} className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-blue-200 hover:text-white transition-all" title={isMinimized ? "Expand" : "Minimize"}>
                  {isMinimized ? <ChevronDown size={14} className="rotate-180" /> : <Minimize2 size={13} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-blue-200 hover:text-white transition-all" title="Close">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* BODY */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/70 min-h-0">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.sender === "bot" && (
                          <div className="w-6 h-6 rounded-lg bg-blue-100 border border-blue-200/60 flex items-center justify-center flex-shrink-0 mb-1">
                            <Bot size={12} className="text-blue-600" />
                          </div>
                        )}

                        <div className={`flex flex-col gap-1 max-w-[82%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3.5 py-2.5 text-[13px] ${
                              msg.sender === "user"
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm shadow-blue-200/60"
                                : msg.isError
                                ? "bg-red-50 text-red-700 border border-red-100 rounded-2xl rounded-bl-sm"
                                : "bg-white text-slate-700 border border-slate-100/80 rounded-2xl rounded-bl-sm shadow-sm"
                            }`}
                          >
                            {msg.sender === "user"
                              ? <p className="leading-relaxed">{msg.text}</p>
                              : <BotMessage text={msg.text} navigate={navigate} />
                            }
                          </div>
                          <span className="text-[10px] text-slate-400 px-1">{formatTime(msg.time)}</span>
                        </div>

                        {msg.sender === "user" && <UserAvatar user={user} />}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {loading && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 border border-blue-200/60 flex items-center justify-center flex-shrink-0">
                        <Bot size={12} className="text-blue-600" />
                      </div>
                      <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                            style={{ animation: "chatbounce 1.2s infinite", animationDelay: `${i * 0.18}s` }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {messages.length <= 1 && (
                  <div className="px-3 py-2.5 bg-white border-t border-slate-100 flex gap-1.5 flex-wrap flex-shrink-0">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => { setMessage(prompt); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-100 text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-200 transition-all font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                <div className="px-3 py-3 border-t border-slate-100 bg-white flex items-center gap-2 flex-shrink-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ask me anything..."
                    maxLength={500}
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:bg-white transition-all"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || loading}
                    className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-sm shadow-blue-200 disabled:shadow-none hover:scale-105 active:scale-95 disabled:scale-100"
                    aria-label="Send message"
                  >
                    <Send size={14} strokeWidth={2.5} />
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
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
};

export default Chatbot;