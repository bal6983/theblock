"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";

type Room = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type MembershipStatus = "pending" | "approved" | "rejected";

type Membership = {
  room_id: string;
  status: MembershipStatus;
  role: string;
};

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    email?: string | null;
  }[] | null;
};

type PendingMember = {
  id: string;
  user_id: string;
  status: MembershipStatus;
  role: string;
  profiles: {
    email: string | null;
  }[];
};


export default function ChatClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [roomName, setRoomName] = useState("");
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = session?.user.id ?? "";

  const membershipMap = useMemo(() => {
    return memberships.reduce<Record<string, Membership>>((acc, membership) => {
      acc[membership.room_id] = membership;
      return acc;
    }, {});
  }, [memberships]);

  const activeMembership = activeRoom ? membershipMap[activeRoom.id] : undefined;
  const isOwner = activeRoom?.created_by === userId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const appendMessage = (incoming: Message) => {
    setMessages((prev) => {
      if (prev.some((message) => message.id === incoming.id)) {
        return prev;
      }
      return [...prev, incoming];
    });
  };

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoadingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoadingSession(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!session) {
      setRooms([]);
      setMemberships([]);
      setActiveRoom(null);
      setPendingMembers([]);
      setMessages([]);
      return;
    }

    const loadRooms = async () => {
      setRoomsLoading(true);
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, created_by, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setStatusMessage("Δεν ήταν δυνατή η φόρτωση των δωματίων.");
      } else {
        setRooms(data ?? []);
      }
      setRoomsLoading(false);
    };

    const loadMemberships = async () => {
      const { data } = await supabase
        .from("room_members")
        .select("room_id, status, role")
        .eq("user_id", session.user.id);

      setMemberships(data ?? []);
    };

    loadRooms();
    loadMemberships();
  }, [session]);

  useEffect(() => {
    if (!activeRoom || !session) {
      setPendingMembers([]);
      return;
    }
    if (!isOwner) {
      setPendingMembers([]);
      return;
    }

    const loadPending = async () => {
      const { data } = await supabase
        .from("room_members")
        .select("id, user_id, status, role, profiles(email)")
        .eq("room_id", activeRoom.id)
        .eq("status", "pending");

      setPendingMembers(data ?? []);
    };

    loadPending();
  }, [activeRoom, isOwner, session]);

  useEffect(() => {
    if (!activeRoom || !session) {
      setMessages([]);
      return;
    }

    if (activeMembership?.status !== "approved") {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, room_id, user_id, content, created_at, profiles(email)")
        .eq("room_id", activeRoom.id)
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
      scrollToBottom();
    };

    loadMessages();
  }, [activeRoom, activeMembership?.status, session]);

  useEffect(() => {
    if (!activeRoom || !session) return;
    if (activeMembership?.status !== "approved") return;

    const channel = supabase
      .channel(`room:${activeRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${activeRoom.id}`,
        },
        async (payload) => {
          const incoming = payload.new as Message;
          if (!incoming?.id) return;

          const { data } = await supabase
            .from("messages")
            .select("id, room_id, user_id, content, created_at, profiles(email)")
            .eq("id", incoming.id)
            .single();

          if (data) {
            appendMessage(data);
            if (
              notificationPermission === "granted" &&
              data.user_id !== session.user.id
            ) {
              new Notification(`Νέο μήνυμα στο ${activeRoom.name}`, {
                body: data.content,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    activeRoom,
    activeMembership?.status,
    notificationPermission,
    session,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthError("Κοίτα το email σου για επιβεβαίωση.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
      }
    }

    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed || !session) return;

    const { data, error } = await supabase
      .from("rooms")
      .insert({ name: trimmed, created_by: session.user.id })
      .select("id, name, created_by, created_at")
      .single();

    if (error) {
      setStatusMessage("Δεν ήταν δυνατή η δημιουργία δωματίου.");
      return;
    }

    setRooms((prev) => [data, ...prev]);
    setRoomName("");
    setActiveRoom(data);

    const { data: membershipData } = await supabase
      .from("room_members")
      .select("room_id, status, role")
      .eq("user_id", session.user.id);

    setMemberships(membershipData ?? []);
  };

  const handleRequestAccess = async (roomId: string) => {
    if (!session) return;

    const { error } = await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: session.user.id,
      status: "pending",
    });

    if (error) {
      setStatusMessage("Δεν ήταν δυνατή η αποστολή αιτήματος.");
      return;
    }

    const { data } = await supabase
      .from("room_members")
      .select("room_id, status, role")
      .eq("user_id", session.user.id);

    setMemberships(data ?? []);
  };

  const handleApproveMember = async (memberId: string, approve: boolean) => {
    const status = approve ? "approved" : "rejected";
    const { error } = await supabase
      .from("room_members")
      .update({ status })
      .eq("id", memberId);

    if (error) {
      setStatusMessage("Δεν ήταν δυνατή η ενημέρωση του αιτήματος.");
      return;
    }

    if (activeRoom) {
      const { data } = await supabase
        .from("room_members")
        .select("id, user_id, status, role, profiles(email)")
        .eq("room_id", activeRoom.id)
        .eq("status", "pending");

      setPendingMembers(data ?? []);
    }
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || !session || !activeRoom) return;

    setMessageLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: activeRoom.id,
        user_id: session.user.id,
        content: trimmed,
      })
      .select("id, room_id, user_id, content, created_at, profiles(email)")
      .single();

    if (error) {
      setStatusMessage("Δεν ήταν δυνατή η αποστολή του μηνύματος.");
    } else if (data) {
      appendMessage(data);
      setMessageText("");
    }

    setMessageLoading(false);
  };

  const handleNotificationRequest = async () => {
    if (notificationPermission === "unsupported") return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  if (!supabaseConfigured) {
    return (
      <section className="chat-card">
        <h2 className="section-title">Live Chat</h2>
        <p className="section-subtitle">
          Πρόσθεσε τα Supabase credentials στο .env.local για να ενεργοποιηθεί
          το chat.
        </p>
      </section>
    );
  }

  if (loadingSession) {
    return <p>Φόρτωση...</p>;
  }

  if (!session) {
    return (
      <section className="chat-card chat-auth">
        <h2 className="section-title">Live Chat</h2>
        <p className="section-subtitle">
          Κάνε εγγραφή ή σύνδεση για να συμμετέχεις.
        </p>
        <form className="chat-form" onSubmit={handleAuth}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Κωδικός</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {authError ? <p className="chat-note">{authError}</p> : null}
          <button type="submit" className="button button--primary">
            {authLoading
              ? "Παρακαλώ περίμενε..."
              : authMode === "signup"
              ? "Εγγραφή"
              : "Σύνδεση"}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() =>
              setAuthMode((prev) => (prev === "signup" ? "signin" : "signup"))
            }
          >
            {authMode === "signup"
              ? "Έχω ήδη λογαριασμό"
              : "Δημιουργία λογαριασμού"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="chat-layout">
      <aside className="chat-sidebar chat-card">
        <div className="chat-sidebar-header">
          <h3>Δωμάτια</h3>
          <button className="button button--ghost" onClick={handleSignOut}>
            Αποσύνδεση
          </button>
        </div>
        <form className="chat-form" onSubmit={handleCreateRoom}>
          <label className="field">
            <span>Νέο δωμάτιο</span>
            <input
              type="text"
              name="room"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Π.χ. Trading Signals"
            />
          </label>
          <button type="submit" className="button button--primary">
            Δημιουργία
          </button>
        </form>
        {roomsLoading ? <p>Φόρτωση...</p> : null}
        <ul className="chat-room-list">
          {rooms.map((room) => {
            const membership = membershipMap[room.id];
            const status = membership?.status;
            const isActive = activeRoom?.id === room.id;
            return (
              <li key={room.id} className="chat-room">
                <button
                  type="button"
                  className={`chat-room-button ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveRoom(room)}
                >
                  <span>{room.name}</span>
                  <span className="chat-room-meta">
                    {room.created_by === userId
                      ? "Owner"
                      : status === "approved"
                      ? "Member"
                      : status === "pending"
                      ? "Pending"
                      : "Locked"}
                  </span>
                </button>
                {!status ? (
                  <button
                    type="button"
                    className="button button--ghost chat-room-action"
                    onClick={() => handleRequestAccess(room.id)}
                  >
                    Αίτημα
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </aside>
      <div className="chat-panel chat-card">
        <div className="chat-panel-header">
          <div>
            <h3>{activeRoom ? activeRoom.name : "Επίλεξε δωμάτιο"}</h3>
            <p className="chat-note">
              {activeRoom
                ? activeMembership?.status === "approved"
                  ? "Έχεις πρόσβαση στο δωμάτιο."
                  : activeMembership?.status === "pending"
                  ? "Το αίτημά σου είναι σε αναμονή."
                  : "Ζήτησε πρόσβαση για να δεις τα μηνύματα."
                : "Διάλεξε ένα δωμάτιο για να ξεκινήσεις."}
            </p>
          </div>
          {notificationPermission !== "unsupported" ? (
            <button
              className="button button--ghost"
              onClick={handleNotificationRequest}
            >
              {notificationPermission === "granted"
                ? "Ειδοποιήσεις ενεργές"
                : "Ενεργοποίηση ειδοποιήσεων"}
            </button>
          ) : null}
        </div>
        {statusMessage ? <p className="chat-note">{statusMessage}</p> : null}
        {activeRoom && activeMembership?.status === "approved" ? (
          <>
            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${
                    message.user_id === userId ? "chat-message--own" : ""
                  }`}
                >
                  <div className="chat-message-meta">
                    <span>
                      {message.user_id === userId
                        ? "Εσύ"
                        : message.profiles?.[0]?.email ?? "Μέλος"}
                    </span>
                    <time>{new Date(message.created_at).toLocaleString()}</time>
                  </div>
                  <p>{message.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Γράψε το μήνυμά σου..."
              />
              <button
                type="submit"
                className="button button--primary"
                disabled={messageLoading}
              >
                Αποστολή
              </button>
            </form>
          </>
        ) : null}
        {activeRoom && isOwner && pendingMembers.length > 0 ? (
          <div className="chat-requests">
            <h4>Αιτήματα πρόσβασης</h4>
            <ul>
              {pendingMembers.map((member) => (
                <li key={member.id} className="chat-request-item">
                  <span>{member.profiles?.[0]?.email ?? member.user_id}</span>
                  <div className="chat-request-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleApproveMember(member.id, true)}
                    >
                      Έγκριση
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleApproveMember(member.id, false)}
                    >
                      Απόρριψη
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
