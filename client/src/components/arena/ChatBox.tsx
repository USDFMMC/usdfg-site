import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/config";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
}

interface ChatBoxProps {
  challengeId: string;
  currentWallet: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ challengeId, currentWallet }) => {
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
      console.log("📨 ChatBox skipped - invalid challengeId:", challengeId);
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
        console.log("📨 Received messages:", snapshot.size);
        const newMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log("💬 Message:", data);
          newMessages.push({ id: doc.id, ...data } as Message);
        });
        
        // Sort manually by timestamp (client-side)
        newMessages.sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return aTime - bTime;
        });
        
        console.log("✅ Messages sorted and ready:", newMessages.length);
        
        // Debug: Check for system messages
        const systemMsgs = newMessages.filter(m => m.sender === 'SYSTEM');
        console.log("🟡 System messages found:", systemMsgs.length, systemMsgs);
        
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
      console.log("📤 Sending message:", { challengeId, text: input.trim(), sender: currentWallet });
      await addDoc(collection(db, "challenge_chats"), {
        challengeId,
        text: input.trim(),
        sender: currentWallet,
        timestamp: serverTimestamp(),
      });
      console.log("✅ Message sent successfully");
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
    <div className="flex flex-col bg-black/30 rounded-xl p-3 h-48 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase">Chat</p>
        <span className="text-xs text-gray-500">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentWallet;
            const isSystem = msg.sender === 'SYSTEM';
            
            // System messages (centered, different style)
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="max-w-[90%] px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-300 text-center">
                    {msg.text}
                  </div>
                </div>
              );
            }
            
            // Regular messages
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
                    isMe
                      ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs text-gray-400 mb-0.5">
                      {msg.sender.slice(0, 6)}...
                    </p>
                  )}
                  <p className="break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none placeholder-gray-500"
          placeholder="Type message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

