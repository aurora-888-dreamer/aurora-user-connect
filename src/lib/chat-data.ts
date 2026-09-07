import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import { listAdminUsers } from "@/lib/admin-auth";
import { getStaffAccounts } from "@/lib/staff-auth";
import { getEmployees } from "@/lib/hris-data";

export type PersonType = "admin" | "staff";

export type Person = {
  type: PersonType;
  id: string;
  userId: string;
  fullName: string;
};

export type ConversationType = "direct" | "department" | "group";

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  /** Display name — the other person for 'direct', the department/group name otherwise. */
  name: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderType: PersonType;
  senderId: string;
  senderUserId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

function personKey(p: Person): string {
  return `${p.type}:${p.id}`;
}

/** Everyone chattable — every admin account plus every staff account. Used for "Semua". */
export async function getAllPeople(): Promise<Person[]> {
  const [admins, staff] = await Promise.all([listAdminUsers(), getStaffAccounts()]);
  const people: Person[] = [
    ...admins.map((a) => ({
      type: "admin" as const,
      id: a.id,
      userId: a.userId,
      fullName: a.fullName,
    })),
    ...staff.map((s) => ({
      type: "staff" as const,
      id: s.id,
      userId: s.userId,
      fullName: s.fullName,
    })),
  ];
  return people.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** Distinct employee departments — the browsable "Departemen" group chats. */
export async function getChatDepartments(): Promise<string[]> {
  const employees = await getEmployees();
  return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort();
}

async function insertParticipants(conversationId: string, people: Person[]): Promise<void> {
  if (people.length === 0) return;
  const { error } = await supabase.from("hpm_chat_participants").insert(
    people.map((p) => ({
      conversation_id: conversationId,
      participant_type: p.type,
      participant_id: p.id,
      participant_user_id: p.userId,
      participant_name: p.fullName,
    })),
  );
  if (error) throw error;
}

/** Opens the 1-on-1 conversation with `other`, creating it (with both as participants) the first time. */
export async function findOrCreateDirectConversation(me: Person, other: Person): Promise<string> {
  const companyId = await getOrCreateCompanyId();
  const directKey = [personKey(me), personKey(other)].sort().join("|");

  const existing = await supabase
    .from("hpm_chat_conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("direct_key", directKey)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;

  const { data, error } = await supabase
    .from("hpm_chat_conversations")
    .insert({
      company_id: companyId,
      type: "direct",
      direct_key: directKey,
      created_by_type: me.type,
      created_by_id: me.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  await insertParticipants(data.id, [me, other]);
  return data.id;
}

/** Opens a department's group chat, creating it the first time — anyone can browse into any department. */
export async function findOrCreateDepartmentConversation(department: string): Promise<string> {
  const companyId = await getOrCreateCompanyId();
  const existing = await supabase
    .from("hpm_chat_conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("type", "department")
    .eq("name", department)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;

  const { data, error } = await supabase
    .from("hpm_chat_conversations")
    .insert({ company_id: companyId, type: "department", name: department })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function createGroupConversation(
  name: string,
  me: Person,
  participants: Person[],
): Promise<string> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_chat_conversations")
    .insert({
      company_id: companyId,
      type: "group",
      name,
      created_by_type: me.type,
      created_by_id: me.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  await insertParticipants(data.id, [me, ...participants]);
  return data.id;
}

/** Direct + group conversations `me` is a participant of, newest activity first. */
export async function getMyConversations(me: Person): Promise<ConversationSummary[]> {
  const { data: myRows, error: myError } = await supabase
    .from("hpm_chat_participants")
    .select("conversation_id")
    .eq("participant_type", me.type)
    .eq("participant_id", me.id);
  if (myError) throw myError;
  const conversationIds = myRows.map((r) => r.conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: convos, error } = await supabase
    .from("hpm_chat_conversations")
    .select("id, type, name, direct_key")
    .in("id", conversationIds);
  if (error) throw error;

  const { data: allParticipants, error: partError } = await supabase
    .from("hpm_chat_participants")
    .select("conversation_id, participant_type, participant_id, participant_name")
    .in("conversation_id", conversationIds);
  if (partError) throw partError;

  return convos.map((c) => {
    if (c.type === "direct") {
      const other = allParticipants.find(
        (p) =>
          p.conversation_id === c.id &&
          !(p.participant_type === me.type && p.participant_id === me.id),
      );
      return { id: c.id, type: "direct" as const, name: other?.participant_name ?? "Kontak" };
    }
    return { id: c.id, type: c.type as ConversationType, name: c.name ?? "Grup" };
  });
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("hpm_chat_messages")
    .select(
      "id, conversation_id, sender_type, sender_id, sender_user_id, sender_name, body, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    senderType: r.sender_type as PersonType,
    senderId: r.sender_id,
    senderUserId: r.sender_user_id,
    senderName: r.sender_name,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function sendMessage(conversationId: string, me: Person, body: string): Promise<void> {
  const { error } = await supabase.from("hpm_chat_messages").insert({
    conversation_id: conversationId,
    sender_type: me.type,
    sender_id: me.id,
    sender_user_id: me.userId,
    sender_name: me.fullName,
    body,
  });
  if (error) throw error;
}

/** Live updates for one open conversation — fires `onMessage` the instant a new row lands, if Realtime is reachable. Returns an unsubscribe function. */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hpm_chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const r = payload.new as {
          id: string;
          conversation_id: string;
          sender_type: string;
          sender_id: string;
          sender_user_id: string;
          sender_name: string;
          body: string;
          created_at: string;
        };
        onMessage({
          id: r.id,
          conversationId: r.conversation_id,
          senderType: r.sender_type as PersonType,
          senderId: r.sender_id,
          senderUserId: r.sender_user_id,
          senderName: r.sender_name,
          body: r.body,
          createdAt: r.created_at,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
