import React, { useState, useRef } from "react"
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Send,
  Paperclip,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isFloating, setIsFloating] = useState(false)
  const [messages, setMessages] = useState<
    { id: number; text: string; sender: "user" | "bot" }[]
  >([
    {
      id: 1,
      text: "Welcome to MatrixAlphaForge. How can I assist your analysis today?",
      sender: "bot",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const chatRef = useRef<HTMLDivElement>(null)

  // Simple drag implementation could be added here, but for now we'll toggle between fixed bottom-right and a "floating" centered mode or similar.
  // Actually, "floating" requesting usually implies a draggable window.
  // We'll implement a simple position state for "floating" vs "docked".

  const toggleChat = () => setIsOpen(!isOpen)
  const toggleFloating = () => setIsFloating(!isFloating)

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newUserMsg = {
      id: Date.now(),
      text: inputValue,
      sender: "user" as const,
    }
    setMessages((prev) => [...prev, newUserMsg])
    setInputValue("")

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "I am standby for market data integration.",
          sender: "bot",
        },
      ])
    }, 1000)
  }

  return (
    <>
      {/* Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 p-4 bg-alpha-primary text-white rounded-full shadow-lg hover:bg-opacity-90 transition-all z-50"
          >
            <MessageSquare size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              right: isFloating ? "50%" : "1.5rem",
              bottom: isFloating ? "50%" : "6rem",
              translateX: isFloating ? "50%" : "0",
              translateY: isFloating ? "50%" : "0",
              width: isFloating ? "600px" : "380px",
              height: isFloating ? "500px" : "600px",
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed bg-alpha-surface border border-alpha-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 ${isFloating ? "resize" : ""}`}
            style={{
              // If we want true draggable, we'd need more complex logic or a library like react-draggable.
              // For this MVP, "floating" basically means "centered/larger mode".
              maxHeight: "80vh",
              maxWidth: "90vw",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-alpha-surface border-b border-alpha-border">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-alpha-success animate-pulse" />
                <span className="font-semibold text-alpha-deep">
                  Matrix Intelligence
                </span>
              </div>
              <div className="flex items-center space-x-2 text-alpha-muted">
                <button
                  onClick={toggleFloating}
                  className="p-1 hover:text-alpha-primary transition-colors"
                >
                  {isFloating ? (
                    <Minimize2 size={18} />
                  ) : (
                    <Maximize2 size={18} />
                  )}
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1 hover:text-alpha-danger transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.sender === "user"
                        ? "bg-alpha-primary text-white rounded-tr-sm"
                        : "bg-white border border-alpha-border text-alpha-body rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form
              onSubmit={sendMessage}
              className="p-4 bg-alpha-surface border-t border-alpha-border"
            >
              <div className="flex items-center space-x-2 bg-alpha-border/30 rounded-xl px-4 py-2 hover:bg-alpha-border/50 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-alpha-primary/20">
                <button
                  type="button"
                  className="text-alpha-muted hover:text-alpha-primary"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask market analysis..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-alpha-deep placeholder-alpha-muted"
                />
                <button
                  type="submit"
                  className="text-alpha-primary hover:scale-110 transition-transform disabled:opacity-50"
                  disabled={!inputValue.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatWidget
