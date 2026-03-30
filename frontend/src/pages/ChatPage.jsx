import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import useChatStore from "../context/chatStore";
import useSocket from "../hooks/useSocket";
import useConversations from "../hooks/useConversations";
import { fetchAllUsers, fetchConversations } from "../services/api";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import WelcomeScreen from "../components/WelcomeScreen";

export default function ChatPage() {
  const { user } = useAuth();
  const { setUsers, setConversations, activeChat } = useChatStore();

  // Attach all socket listeners
  useSocket();
  // Keep sidebar conversations fresh
  useConversations();

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const [users, convos] = await Promise.all([
          fetchAllUsers("", user.id),
          fetchConversations(user.id),
        ]);
        setUsers(users);
        setConversations(convos);
      } catch (err) {
        console.error("ChatPage load error:", err);
      }
    };

    load();
  }, [user]);

return (
  <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
    <div className="flex w-full max-w-[1600px] mx-auto shadow-2xl overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      
      {/* On mobile: show sidebar only when no chat is active */}
      <div className={`
        ${activeChat ? "hidden" : "flex"} md:flex
        w-full md:w-auto
      `}>
        <Sidebar />
      </div>

      {/* On mobile: show chat only when a chat is active */}
      <div className={`
        ${activeChat ? "flex" : "hidden"} md:flex
        flex-1 flex-col overflow-hidden
      `}>
        {activeChat ? <ChatWindow /> : <WelcomeScreen />}
      </div>

    </div>
  </div>
);
}
