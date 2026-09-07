import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Trash2, Contact as ContactIcon } from "lucide-react";
import {
  getContactList,
  getAddableContacts,
  addContact,
  deleteContact,
  type ContactEntry,
} from "@/lib/contacts-data";
import type { UserProfile } from "@/lib/admin-auth";

export function ContactListSection({ readOnly }: { readOnly?: boolean }) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [addable, setAddable] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    setLoading(true);
    getContactList()
      .then(setContacts)
      .catch(() => toast.error("Gagal memuat contact list."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const openAdd = () => {
    setSelectedAdminId("");
    getAddableContacts()
      .then(setAddable)
      .catch(() => setAddable([]));
    setAdding(true);
  };

  const handleAdd = async () => {
    if (!selectedAdminId) return;
    setSubmitting(true);
    try {
      await addContact(selectedAdminId);
      toast.success("Kontak ditambahkan.");
      setAdding(false);
      refresh();
    } catch {
      toast.error("Gagal menambahkan kontak. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      toast.success("Kontak dihapus.");
      refresh();
    } catch {
      toast.error("Gagal menghapus kontak. Coba lagi.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ContactIcon className="size-4 text-primary" /> Contact List
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Diambil langsung dari User ID Directory — nama &amp; WA selalu sinkron. Ubah nama/WA
            lewat akun admin-nya sendiri, bukan di sini.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openAdd}>
            <UserPlus className="size-4" /> Tambah Kontak
          </Button>
        )}
      </div>

      <section className="glass-panel overflow-hidden">
        {loading ? (
          <p className="p-7 text-sm text-muted-foreground">Memuat…</p>
        ) : contacts.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada kontak ditambahkan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{c.fullName}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-mono">
                      {c.userId}
                    </Badge>
                    {c.phoneWA || "No. WA belum diisi"}
                  </p>
                </div>
                {!readOnly && (
                  <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Kontak</DialogTitle>
          </DialogHeader>
          <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih dari User ID Directory" />
            </SelectTrigger>
            <SelectContent>
              {addable.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Semua akun sudah ada di contact list.
                </div>
              ) : (
                addable.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.fullName} ({a.userId})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Batal
            </Button>
            <Button onClick={handleAdd} disabled={!selectedAdminId || submitting}>
              {submitting ? "Menambahkan…" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
