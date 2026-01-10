import ChatClient from "@/components/chat/chat-client";

export default function ChatPage() {
  return (
    <main>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Live Chat</h1>
          <p className="section-subtitle">
            Real-time chat για trades, signals και συζητήσεις με έγκριση ανά
            δωμάτιο.
          </p>
        </div>
        <ChatClient />
      </section>
    </main>
  );
}
