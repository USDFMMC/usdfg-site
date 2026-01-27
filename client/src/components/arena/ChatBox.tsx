import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/config";

const linkRegex = /(https?:\/\/[^\s]+)/g;

const renderMessageText = (text: string) => {
  const parts = text.split(linkRegex);
  return parts.map((part, index) => {
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-300 underline hover:text-amber-200"
        >
          {part}
        </a>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
};

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
}

interface ChatBoxProps {
  challengeId: string;
  currentWallet: string;
  status?: string; // Challenge status (e.g., 'active')
  platform?: string; // Platform info (e.g., 'PS5')
  playersCount?: number; // Number of players
}

export const ChatBox: React.FC<ChatBoxProps> = ({ challengeId, currentWallet, status, platform, playersCount }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for real-time messages
  useEffect(() => {
    // Skip if challengeId is invalid
    if (!challengeId || challengeId.trim() === '') {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, "challenge_chats");
    // Query without orderBy to avoid index requirement - we'll sort client-side
    const q = query(
      messagesRef,
      where("challengeId", "==", challengeId)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const newMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newMessages.push({ id: doc.id, ...data } as Message);
        });
        
        // Sort manually by timestamp (client-side)
        newMessages.sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return aTime - bTime;
        });
        
        setMessages(newMessages);
      },
      (error) => {
        console.error("❌ Chat listener error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
      }
    );

    return () => unsubscribe();
  }, [challengeId]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, "challenge_chats"), {
        challengeId,
        text: input.trim(),
        sender: currentWallet,
        timestamp: serverTimestamp(),
      });
      setInput("");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      alert("Failed to send message. Check console for details.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Match Chat</p>
        <span className="text-[10px] text-gray-500">{messages.length}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1.5 mb-1.5 min-h-0 scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent scrollbar-thumb-rounded">
        {/* Automatic gamer tag exchange message - shown when challenge is active or disputed */}
        {(status === 'active' || status === 'disputed') && playersCount && playersCount >= 2 && (
          <div className="flex justify-center my-1">
            <div className={`max-w-[90%] px-2 py-1 rounded text-[10px] text-center ${
              status === 'disputed' 
                ? 'bg-red-500/10 border border-red-500/20 text-red-300/80'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-300/80'
            }`}>
              {status === 'disputed' 
                ? '🔴 Dispute: Waiting for admin resolution. Chat remains open.'
                : 'Share your platform ID (PSN, Xbox, Steam, etc.)'
              }
            </div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <p className="text-gray-500/70 text-[10px] text-center py-3">
            No messages yet
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentWallet;
            const isSystem = msg.sender === 'SYSTEM';
            
            // System messages (centered, different style)
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="max-w-[90%] px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-300/80 text-center">
                    {renderMessageText(msg.text)}
                  </div>
                </div>
              );
            }
            
            // Regular messages
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"} px-0.5`}
              >
                <div
                  className={`max-w-[85%] px-2 py-1 rounded-md text-[11px] leading-relaxed ${
                    isMe
                      ? "bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-white"
                      : "bg-white/5 text-gray-300 border border-white/10"
                  }`}
                >
                  {!isMe && (
                    <p className="text-[9px] text-gray-400/70 mb-0.5 leading-tight">
                      {msg.sender.slice(0, 6)}...
                    </p>
                  )}
                  <p className="break-words leading-snug">{renderMessageText(msg.text)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
        <input
          className="flex-1 bg-white/5 text-white text-[11px] px-2 py-1.5 rounded-md border border-white/10 focus:border-amber-500/50 focus:outline-none placeholder-gray-500/60 focus:bg-white/10 transition-all"
          placeholder="Type message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-1.5 rounded-md transition-all flex-shrink-0"
        >
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

