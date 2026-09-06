import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, LogIn, LogOut, ScanFace, AlertTriangle } from "lucide-react";
import { FaceCaptureDialog } from "@/components/FaceCaptureDialog";
import {
  getCompanyProfile,
  isOfficeLocationSet,
  distanceMeters,
  DEFAULT_OFFICE_RADIUS_METERS,
  type CompanyProfile,
} from "@/lib/company-data";
import {
  clockIn,
  clockOut,
  todayRecordFor,
  type Employee,
  type AttendanceRecord,
} from "@/lib/hris-data";

export function AttendanceFlow({
  employee,
  onChange,
}: {
  employee: Employee | null;
  onChange: () => void;
}) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [dialog, setDialog] = useState<null | "outside" | "enroll-needed" | "verify">(null);
  const [outsideConfirmed, setOutsideConfirmed] = useState(false);
  const [outsideNote, setOutsideNote] = useState("");
  const [outsideTask, setOutsideTask] = useState("");
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    coords?: { lat: string; long: string };
    distanceMeters?: number;
    isOutsideOffice?: boolean;
    outsideLocationNote?: string;
    outsideTaskStatus?: string;
  }>({});

  useEffect(() => {
    getCompanyProfile()
      .then(setCompany)
      .catch(() => toast.error("Gagal memuat pengaturan kantor."));
  }, []);

  useEffect(() => {
    if (!employee) {
      setRecord(null);
      return;
    }
    todayRecordFor(employee.id)
      .then(setRecord)
      .catch(() => setRecord(null));
  }, [employee]);

  const officeRadiusMeters = company?.officeRadiusMeters ?? DEFAULT_OFFICE_RADIUS_METERS;
  const officeConfigured = company ? isOfficeLocationSet(company) : false;

  const resetFlow = () => {
    setDialog(null);
    setOutsideConfirmed(false);
    setOutsideNote("");
    setOutsideTask("");
    setPending({});
  };

  const proceedAfterGps = (partial: typeof pending) => {
    setPending((p) => ({ ...p, ...partial }));
    if (!employee?.faceDescriptor) {
      setDialog("enroll-needed");
      return;
    }
    setDialog("verify");
  };

  const handleClockIn = () => {
    if (!employee || !company) return;
    if (!navigator.geolocation) {
      proceedAfterGps({});
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const coords = { lat: String(pos.coords.latitude), long: String(pos.coords.longitude) };
        if (officeConfigured) {
          const dist = distanceMeters(
            pos.coords.latitude,
            pos.coords.longitude,
            company.officeLat!,
            company.officeLng!,
          );
          if (dist > officeRadiusMeters) {
            setPending({ coords, distanceMeters: dist, isOutsideOffice: true });
            setDialog("outside");
            return;
          }
          proceedAfterGps({ coords, distanceMeters: dist, isOutsideOffice: false });
        } else {
          proceedAfterGps({ coords });
        }
      },
      () => {
        setGpsLoading(false);
        toast.warning("Lokasi tidak tersedia — absensi lanjut tanpa validasi GPS.");
        proceedAfterGps({});
      },
    );
  };

  const handleClockOut = async () => {
    if (!employee) return;
    setBusy(true);
    try {
      await clockOut(employee.id);
      toast.success("Clock-out tercatat.");
      onChange();
    } catch {
      toast.error("Gagal mencatat clock-out. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Pilih karyawan dulu.</p>;
  }

  return (
    <div>
      {company && !officeConfigured && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-500">
          <AlertTriangle className="size-3.5" />
          Titik lokasi kantor belum diatur — buka menu <strong>Pengaturan</strong> agar validasi
          radius {officeRadiusMeters}m bisa aktif.
        </p>
      )}
      {!employee.faceDescriptor && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-500">
          <ScanFace className="size-3.5" />
          Wajah belum terdaftar — daftarkan dulu sebelum bisa Clock In dengan FaceID.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleClockIn}
          disabled={!!record?.clockIn || gpsLoading || !company || busy}
        >
          <LogIn className="size-4" /> {gpsLoading ? "Mengambil lokasi…" : "Clock In"}
        </Button>
        <Button
          onClick={handleClockOut}
          disabled={!record?.clockIn || !!record?.clockOut || busy}
          variant="secondary"
        >
          <LogOut className="size-4" /> Clock Out
        </Button>
      </div>

      {record && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{record.status}</Badge>
          {record.clockIn && (
            <span>Masuk: {new Date(record.clockIn).toLocaleTimeString("id-ID")}</span>
          )}
          {record.clockOut && (
            <span>Pulang: {new Date(record.clockOut).toLocaleTimeString("id-ID")}</span>
          )}
          {record.latIn && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {record.latIn}, {record.longIn}
            </span>
          )}
          {record.isOutsideOffice && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" /> Di luar kantor (
              {record.distanceMeters?.toFixed(0)}
              m)
            </Badge>
          )}
          {record.photoDataUrl && (
            <img
              src={record.photoDataUrl}
              alt="Selfie absensi"
              className="size-10 rounded-full border border-border object-cover"
            />
          )}
        </div>
      )}

      {/* Step 1: outside-office confirmation + mandatory location/task form */}
      <Dialog open={dialog === "outside"} onOpenChange={(v) => !v && resetFlow()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" />
              Anda berada di luar area kantor
            </DialogTitle>
            <DialogDescription>
              Jarak Anda sekitar <strong>{pending.distanceMeters?.toFixed(0)} meter</strong> dari
              titik kantor (radius yang diizinkan {officeRadiusMeters}m). Apakah Anda tetap ingin
              melakukan absensi?
            </DialogDescription>
          </DialogHeader>

          {!outsideConfirmed ? (
            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={resetFlow}>
                Tidak, Batalkan
              </Button>
              <Button onClick={() => setOutsideConfirmed(true)}>Ya, Tetap Absen</Button>
            </DialogFooter>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Posisi Lokasi</Label>
                <Input
                  className="mt-2"
                  value={outsideNote}
                  onChange={(e) => setOutsideNote(e.target.value)}
                  placeholder="Contoh: Kantor klien PT Maju Jaya, Bekasi"
                />
              </div>
              <div>
                <Label>Status Tugas</Label>
                <Select value={outsideTask} onValueChange={setOutsideTask}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih status tugas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinas Luar Kota">Dinas Luar Kota</SelectItem>
                    <SelectItem value="Kunjungan Klien">Kunjungan Klien</SelectItem>
                    <SelectItem value="WFH / Remote">WFH / Remote</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="sm:justify-center">
                <Button
                  disabled={!outsideNote.trim() || !outsideTask}
                  onClick={() =>
                    proceedAfterGps({
                      outsideLocationNote: outsideNote.trim(),
                      outsideTaskStatus: outsideTask,
                    })
                  }
                >
                  Lanjutkan ke FaceID
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Step 2a: employee has no enrolled face yet */}
      <Dialog open={dialog === "enroll-needed"} onOpenChange={(v) => !v && resetFlow()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="size-5 text-primary" />
              Wajah belum terdaftar
            </DialogTitle>
            <DialogDescription>
              {employee.fullName} belum mendaftarkan wajah. Daftarkan dulu, lalu ulangi Clock In.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={resetFlow}>Mengerti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2b: FaceID verification, then commit the clock-in */}
      {dialog === "verify" && employee.faceDescriptor && (
        <FaceCaptureDialog
          open
          mode="verify"
          employeeName={employee.fullName}
          enrolledDescriptor={employee.faceDescriptor}
          onClose={resetFlow}
          onVerified={async (result) => {
            if (result.matched) {
              try {
                await clockIn(employee.id, {
                  ...(pending.coords ? { coords: pending.coords } : {}),
                  ...(pending.distanceMeters !== undefined
                    ? { distanceMeters: pending.distanceMeters }
                    : {}),
                  ...(pending.isOutsideOffice !== undefined
                    ? { isOutsideOffice: pending.isOutsideOffice }
                    : {}),
                  ...(pending.outsideLocationNote
                    ? { outsideLocationNote: pending.outsideLocationNote }
                    : {}),
                  ...(pending.outsideTaskStatus
                    ? { outsideTaskStatus: pending.outsideTaskStatus }
                    : {}),
                  photoDataUrl: result.photoDataUrl,
                });
                toast.success("Absensi berhasil — wajah terverifikasi.");
              } catch {
                toast.error("Gagal menyimpan absensi. Coba lagi.");
              }
            } else {
              toast.error(
                `Wajah tidak cocok (jarak ${result.distance.toFixed(2)}). Absensi ditolak.`,
              );
            }
            resetFlow();
            onChange();
          }}
        />
      )}
    </div>
  );
}
