import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Mic, MicOff } from "lucide-react";
import { chatApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

export function AIChatbot() {
  const { lang: language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "bot" | "user"; content: string }[]>([
    { role: "bot", content: language === 'te' ? "నమస్తే! నేను మీ AI దుకాణమిత్ర సహాయకుడిని. నేను మీకు విక్రయాలను విశ్లేషించడంలో, డిమాండ్‌ను అంచనా వేయడంలో లేదా మీ ఇన్వెంటరీ గురించిన ప్రశ్నలకు సమాధానం ఇవ్వడంలో సహాయపడగలను." : "Hi! I'm your AI DukaanMitra assistant. I can help you analyze sales, predict demand, or answer questions about your inventory." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 1) {
      setMessages([{ role: "bot", content: language === 'te' ? "నమస్తే! నేను మీ AI దుకాణమిత్ర సహాయకుడిని. నేను మీకు విక్రయాలను విశ్లేషించడంలో, డిమాండ్‌ను అంచనా వేయడంలో లేదా మీ ఇన్వెంటరీ గురించిన ప్రశ్నలకు సమాధానం ఇవ్వడంలో సహాయపడగలను." : "Hi! I'm your AI DukaanMitra assistant. I can help you analyze sales, predict demand, or answer questions about your inventory." }]);
    }
  }, [language]);

  const speak = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === 'te' ? 'te-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'te' ? 'te-IN' : 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await chatApi.sendMessage(userMsg, language);
      setMessages((prev) => [...prev, { role: "bot", content: res.data }]);
      speak(res.data, language || 'en');
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "bot", content: "Sorry, I had trouble connecting to the backend. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-6 md:bottom-6 md:right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform z-50 ${
          isOpen ? "hidden" : "flex"
        }`}
        style={{
          boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.5), 0 8px 10px -6px rgba(79, 70, 229, 0.1)",
        }}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 md:bottom-6 md:right-6 w-[350px] max-w-[calc(100vw-48px)] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Mitra AI</h3>
                <p className="text-[10px] text-blue-100">Smart Business Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-gray-200" : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {msg.role === "user" ? <User size={14} className="text-gray-600" /> : <Bot size={14} />}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-100 shadow-sm rounded-tl-sm text-gray-700"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-600">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="p-3 rounded-2xl text-sm bg-white border border-gray-100 shadow-sm rounded-tl-sm text-gray-500 italic">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex gap-2">
              <button
                type="button"
                onClick={isListening ? undefined : startListening}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                  isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Speak"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'te' ? "మైక్‌పై మాట్లాడండి లేదా టైప్ చేయండి..." : "Ask about sales, inventory..."}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-0"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
