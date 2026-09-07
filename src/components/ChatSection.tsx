import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Send, Users, Building2, UserPlus, MessageCircle } from "lucide-react";
import {
  getAllPeople,
  getChatDepartments,
  getMyConversations,
  findOrCreateDirectConversation,
  findOrCreateDepartmentConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  subscribeToMessages,
  type Person,
  type ConversationSummary,
  type ChatMessage,
} from "@/lib/chat-data";

type ListTab = "mine" | "all" | "department" | "group";

export function ChatSection({ me }: { me: Person }) {
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [tab, setTab] = useState<ListTab>("mine");
  const [myConversations, setMyConversations] = useState<ConversationSummary[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<Set<string>>(new Set());
  const [submittingGroup, setSubmittingGroup] = useState(false);

  const refreshList = () => {
    setLoading(true);
    Promise.all([getMyConversations(me), getAllPeople(), getChatDepartments()])
      .then(([convos, ppl, depts]) => {
        setMyConversations(convos);
        setPeople(ppl.filter((p) => !(p.type === me.type && p.id === me.id)));
        setDepartments(depts);
      })
      .catch(() => toast.error("Gagal memuat daftar chat."))
      .finally(() => setLoading(false));
  };

  useEffect(refreshList, []);

  const openDirect = async (other: Person) => {
    try {
      const id = await findOrCreateDirectConversation(me, other);
      setActiveConversation({ id, type: "direct", name: other.fullName });
    } catch {
      toast.error("Gagal membuka chat.");
    }
  };

  const openDepartment = async (department: string) => {
    try {
      const id = await findOrCreateDepartmentConversation(department);
      setActiveConversation({ id, type: "department", name: department });
    } catch {
      toast.error("Gagal membuka chat departemen.");
    }
  };

  const toggleGroupMember = (key: string) => {
    setGroupMembers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMembers.size === 0) {
      toast.error("Isi nama grup dan pilih minimal satu anggota.");
      return;
    }
    setSubmittingGroup(true);
    try {
      const members = people.filter((p) => groupMembers.has(`${p.type}:${p.id}`));
      const id = await createGroupConversation(groupName.trim(), me, members);
      toast.success("Grup dibuat.");
      setCreatingGroup(false);
      setGroupName("");
      setGroupMembers(new Set());
      setActiveConversation({ id, type: "group", name: groupName.trim() });
      refreshList();
    } catch {
      toast.error("Gagal membuat grup. Coba lagi.");
    } finally {
      setSubmittingGroup(false);
    }
  };

  if (activeConversation) {
    return (
      <ChatThread
        me={me}
        conversation={activeConversation}
        onBack={() => {
          setActiveConversation(null);
          refreshList();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="size-4 text-primary" /> Chat
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat sesama admin &amp; staff — langsung, per departemen, atau grup buatan sendiri.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["mine", "Chat Saya"],
            ["all", "Semua"],
            ["department", "Departemen"],
            ["group", "Grup"],
          ] as [ListTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
              tab === key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : tab === "mine" ? (
        myConversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada chat. Mulai dari tab Semua, Departemen, atau Grup.
          </p>
        ) : (
          <ul className="space-y-2">
            {myConversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveConversation(c)}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left text-sm hover:border-primary/40"
                >
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="secondary">
                    {c.type === "direct"
                      ? "Personal"
                      : c.type === "department"
                        ? "Departemen"
                        : "Grup"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : tab === "all" ? (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={`${p.type}:${p.id}`}>
              <button
                onClick={() => openDirect(p)}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left text-sm hover:border-primary/40"
              >
                <span className="font-medium">{p.fullName}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {p.userId}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : tab === "department" ? (
        <ul className="space-y-2">
          {departments.map((d) => (
            <li key={d}>
              <button
                onClick={() => openDepartment(d)}
                className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left text-sm hover:border-primary/40"
              >
                <Building2 className="size-4 text-muted-foreground" /> {d}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3">
          <Button onClick={() => setCreatingGroup(true)}>
            <UserPlus className="size-4" /> Buat Grup Baru
          </Button>
          <ul className="space-y-2">
            {myConversations
              .filter((c) => c.type === "group")
              .map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveConversation(c)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left text-sm hover:border-primary/40"
                  >
                    <Users className="size-4 text-muted-foreground" /> {c.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <Dialog open={creatingGroup} onOpenChange={setCreatingGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Grup Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Grup</Label>
              <Input
                className="mt-2"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Tim Proyek A"
              />
            </div>
            <div>
              <Label>Anggota</Label>
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {people.map((p) => {
                  const key = `${p.type}:${p.id}`;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={groupMembers.has(key)}
                        onChange={() => toggleGroupMember(key)}
                      />
                      {p.fullName}
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {p.userId}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingGroup(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateGroup} disabled={submittingGroup}>
              {submittingGroup ? "Membuat…" : "Buat Grup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatThread({
  me,
  conversation,
  onBack,
}: {
  me: Person;
  conversation: ConversationSummary;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getMessages(conversation.id)
      .then(setMessages)
      .catch(() => toast.error("Gagal memuat pesan."))
      .finally(() => setLoading(false));

    const unsubscribe = subscribeToMessages(conversation.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return unsubscribe;
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody("");
    try {
      await sendMessage(conversation.id, me, text);
    } catch {
      toast.error("Gagal mengirim pesan.");
      setBody(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[28rem] flex-col">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </button>
        <p className="font-semibold">{conversation.name}</p>
        <Badge variant="secondary" className="ml-auto">
          {conversation.type === "direct"
            ? "Personal"
            : conversation.type === "department"
              ? "Departemen"
              : "Grup"}
        </Badge>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat pesan…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pesan. Mulai percakapan.</p>
        ) : (
          messages.map((m) => {
            const isMe = m.senderType === me.type && m.senderId === me.id;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {!isMe && conversation.type !== "direct" && (
                    <p className="mb-0.5 text-xs font-medium opacity-70">{m.senderName}</p>
                  )}
                  <p>{m.body}</p>
                  <p className="mt-0.5 text-right text-[0.65rem] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-border pt-3">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Tulis pesan…"
        />
        <Button onClick={handleSend} disabled={sending || !body.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
