import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import { listAdminUsers, type UserProfile } from "@/lib/admin-auth";

export type ContactEntry = {
  /** hpm_contacts row id — used to delete this entry from the list. */
  id: string;
  adminId: string;
  userId: string;
  fullName: string;
  phoneWA: string;
};

type ContactRow = {
  id: string;
  admin_id: string;
};

/**
 * One shared Contact List per company, referenced from HRIS, Finance, ATS,
 * and the Staff app. Entries are just a marker ("this admin is in the
 * list") pointing at hpm_admin_users — name/WA aren't duplicated here, so
 * they always match the User ID Directory. That's also why there's no
 * "edit": change the person's name/WA on their admin account, not here.
 */
export async function getContactList(): Promise<ContactEntry[]> {
  const companyId = await getOrCreateCompanyId();
  const [{ data, error }, admins] = await Promise.all([
    supabase.from("hpm_contacts").select("id, admin_id").eq("company_id", companyId),
    listAdminUsers(),
  ]);
  if (error) throw error;
  const adminById = new Map(admins.map((a) => [a.id, a]));
  return (data as ContactRow[])
    .map((row) => {
      const admin = adminById.get(row.admin_id);
      if (!admin) return null;
      return {
        id: row.id,
        adminId: admin.id,
        userId: admin.userId,
        fullName: admin.fullName,
        phoneWA: admin.phoneWA,
      };
    })
    .filter((c): c is ContactEntry => c !== null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** Admins not yet in the contact list — the options for "Tambah Kontak". */
export async function getAddableContacts(): Promise<UserProfile[]> {
  const [contacts, admins] = await Promise.all([getContactList(), listAdminUsers()]);
  const alreadyAdded = new Set(contacts.map((c) => c.adminId));
  return admins.filter((a) => !alreadyAdded.has(a.id));
}

export async function addContact(adminId: string): Promise<void> {
  const companyId = await getOrCreateCompanyId();
  const { error } = await supabase
    .from("hpm_contacts")
    .insert({ company_id: companyId, admin_id: adminId });
  if (error) throw error;
}

export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase.from("hpm_contacts").delete().eq("id", contactId);
  if (error) throw error;
}
