import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

function toAnnouncement(row: AnnouncementRow): Announcement {
  return { id: row.id, title: row.title, body: row.body, createdAt: row.created_at };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_announcements")
    .select("id, title, body, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AnnouncementRow[]).map(toAnnouncement);
}

export async function addAnnouncement(input: {
  title: string;
  body: string;
}): Promise<Announcement> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_announcements")
    .insert({ company_id: companyId, title: input.title, body: input.body })
    .select("id, title, body, created_at")
    .single();
  if (error) throw error;
  return toAnnouncement(data as AnnouncementRow);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_announcements").delete().eq("id", id);
  if (error) throw error;
}
