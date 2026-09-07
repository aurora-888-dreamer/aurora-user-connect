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
import { MapPin, LogIn, LogOut, ScanFace, AlertTriangle, History } from "lucide-react";
import { FaceCaptureDialog } from "@/components/FaceCaptureDialog";
import {
  getCompanyProfile,
  distanceMeters,
  isPastSchedule,
  type CompanyProfile,
} from "@/lib/company-data";
import {
  clockIn,
  clockOut,
  getTodaySessionsFor,
  resolveEffectiveLocation,
  resolveEffectiveShift,
  isShiftActiveOn,
  type Employee,
  type AttendanceRecord,
  type ShiftType,
} from "@/lib/hris-data";

export function AttendanceFlow({
  employee,
  onChange,
}: {
  employee: Employee | null;
  onChange: () => void;
}) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [dialog, setDialog] = useState<
    null | "outside" | "late-in" | "late-out" | "enroll-needed" | "verify" | "verify-out"
  >(null);
  const [outsideConfirmed, setOutsideConfirmed] = useState(false);
  const [outsideNote, setOutsideNote] = useState("");
  const [outsideTask, setOutsideTask] = useState("");
  const [lateInReasonText, setLateInReasonText] = useState("");
  const [lateOutReasonText, setLateOutReasonText] = useState("");
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [effectiveLocation, setEffectiveLocation] = useState<{
    name: string;
    lat: number | null;
    lng: number | null;
    radiusMeters: number;
  } | null>(null);
  const [effectiveShift, setEffectiveShift] = useState<ShiftType | null>(null);
  const [sessions, setSessions] = useState<AttendanceRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    coords?: { lat: string; long: string };
    distanceMeters?: number;
    isOutsideOffice?: boolean;
    outsideLocationNote?: string;
    outsideTaskStatus?: string;
    lateInReason?: string;
  }>({});
  const [pendingOutReason, setPendingOutReason] = useState<string | undefined>(undefined);

  const openSession = sessions.find((s) => !s.clockOut) ?? null;

  const reloadSessions = () => {
    if (!employee) {
      setSessions([]);
      return;
    }
    getTodaySessionsFor(employee.id)
      .then(setSessions)
      .catch(() => setSessions([]));
  };

  useEffect(() => {
    getCompanyProfile()
      .then(setCompany)
      .catch(() => toast.error("Gagal memuat pengaturan kantor."));
  }, []);

  useEffect(() => {
    if (!employee) {
      setEffectiveLocation(null);
      setEffectiveShift(null);
      return;
    }
    resolveEffectiveLocation(employee)
      .then(setEffectiveLocation)
      .catch(() => setEffectiveLocation(null));
    resolveEffectiveShift(employee)
      .then(setEffectiveShift)
      .catch(() => setEffectiveShift(null));
  }, [employee]);

  useEffect(reloadSessions, [employee]);

  const officeRadiusMeters = effectiveLocation?.radiusMeters ?? 30;
  const officeConfigured = !!(effectiveLocation?.lat && effectiveLocation?.lng);

  const resetFlow = () => {
    setDialog(null);
    setOutsideConfirmed(false);
    setOutsideNote("");
    setOutsideTask("");
    setLateInReasonText("");
    setLateOutReasonText("");
    setPending({});
    setPendingOutReason(undefined);
  };

  const proceedAfterGps = (partial: typeof pending) => {
    setPending((p) => ({ ...p, ...partial }));
    const isFirstSessionToday = sessions.length === 0;
    if (
      isFirstSessionToday &&
      effectiveShift &&
      isShiftActiveOn(effectiveShift) &&
      isPastSchedule(effectiveShift.startTime, effectiveShift.lateGraceMinutes)
    ) {
      setDialog("late-in");
      return;
    }
    if (!employee?.faceDescriptor) {
      setDialog("enroll-needed");
      return;
    }
    setDialog("verify");
  };

  const proceedAfterLateInReason = () => {
    setPending((p) => ({ ...p, lateInReason: lateInReasonText.trim() }));
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
        if (officeConfigured && effectiveLocation) {
          const dist = distanceMeters(
            pos.coords.latitude,
            pos.coords.longitude,
            effectiveLocation.lat!,
            effectiveLocation.lng!,
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

  const performClockOut = async (photoDataUrl: string, reason?: string) => {
    if (!employee) return;
    setBusy(true);
    try {
      await clockOut(employee.id, reason);
      toast.success("Clock-out tercatat — wajah terverifikasi.");
      resetFlow();
      reloadSessions();
      onChange();
    } catch {
      toast.error("Gagal mencatat clock-out. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const proceedToClockOutFace = () => {
    if (!employee?.faceDescriptor) {
      setDialog("enroll-needed");
      return;
    }
    setDialog("verify-out");
  };

  const handleClockOut = () => {
    if (!employee || !openSession) return;
    const needsReason =
      !openSession.isOutsideOffice &&
      effectiveShift &&
      isShiftActiveOn(effectiveShift) &&
      isPastSchedule(effectiveShift.endTime, effectiveShift.earlyLeaveGraceMinutes);
    if (needsReason) {
      setDialog("late-out");
      return;
    }
    proceedToClockOutFace();
  };

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Pilih karyawan dulu.</p>;
  }

  return (
    <div>
      {company && !officeConfigured && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-500">
          <AlertTriangle className="size-3.5" />
          Titik lokasi {effectiveLocation?.name ?? "kantor"} belum diatur — atur di menu{" "}
          <strong>Pengaturan</strong> atau <strong>Lokasi</strong> agar validasi radius{" "}
          {officeRadiusMeters}m bisa aktif.
        </p>
      )}
      {!employee.faceDescriptor && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-500">
          <ScanFace className="size-3.5" />
          Wajah belum terdaftar — daftarkan dulu sebelum bisa Clock In dengan FaceID.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleClockIn} disabled={!!openSession || gpsLoading || !company || busy}>
          <LogIn className="size-4" /> {gpsLoading ? "Mengambil lokasi…" : "Clock In"}
        </Button>
        <Button onClick={handleClockOut} disabled={!openSession || busy} variant="secondary">
          <LogOut className="size-4" /> Clock Out
        </Button>
      </div>
      {sessions.length > 0 && !openSession && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sudah clock-out. Boleh Clock In lagi hari ini kalau keluar-masuk tugas (dinas, kunjungan
          klien, dll).
        </p>
      )}

      {sessions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="size-3.5" /> Sesi hari ini ({sessions.length})
          </p>
          {sessions.map((record, i) => (
            <div
              key={record.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5 text-sm text-muted-foreground"
            >
              <span className="font-medium text-foreground">#{i + 1}</span>
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
                  m){record.outsideTaskStatus ? ` — ${record.outsideTaskStatus}` : ""}
                </Badge>
              )}
              {record.photoDataUrl && (
                <img
                  src={record.photoDataUrl}
                  alt="Selfie absensi"
                  className="size-10 rounded-full border border-border object-cover"
                />
              )}
              {(record.lateInReason || record.lateOutReason) && (
                <div className="w-full text-xs">
                  {record.lateInReason && (
                    <p>
                      <span className="text-amber-500">Alasan telat masuk:</span>{" "}
                      {record.lateInReason}
                    </p>
                  )}
                  {record.lateOutReason && (
                    <p>
                      <span className="text-amber-500">Alasan pulang telat:</span>{" "}
                      {record.lateOutReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: outside-office confirmation + mandatory location/task form */}
      <Dialog open={dialog === "outside"} onOpenChange={(v) => !v && resetFlow()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" />
              Anda berada di luar area {effectiveLocation?.name ?? "kantor"}
            </DialogTitle>
            <DialogDescription>
              Jarak Anda sekitar <strong>{pending.distanceMeters?.toFixed(0)} meter</strong> dari
              titik {effectiveLocation?.name ?? "kantor"} (radius yang diizinkan{" "}
              {officeRadiusMeters}m). Apakah Anda tetap ingin melakukan absensi?
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

      {/* Step 1b: late clock-in (>15 min past jam masuk) — reason required */}
      <Dialog open={dialog === "late-in"} onOpenChange={(v) => !v && resetFlow()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" />
              Anda terlambat masuk
            </DialogTitle>
            <DialogDescription>
              Sudah lebih dari {effectiveShift?.lateGraceMinutes ?? 15} menit dari jam masuk{" "}
              {effectiveShift?.name ? `shift ${effectiveShift.name}` : ""} (
              {effectiveShift?.startTime}). Berikan alasan keterlambatan — HRD akan memutuskan
              apakah perlu persetujuan atasan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Alasan Terlambat</Label>
              <Input
                className="mt-2"
                value={lateInReasonText}
                onChange={(e) => setLateInReasonText(e.target.value)}
                placeholder="Contoh: Macet parah di tol dalam kota"
              />
            </div>
            <DialogFooter className="sm:justify-center">
              <Button disabled={!lateInReasonText.trim()} onClick={proceedAfterLateInReason}>
                Lanjutkan ke FaceID
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Late clock-out (>60 min past jam pulang, non-field-duty) — reason required */}
      <Dialog open={dialog === "late-out"} onOpenChange={(v) => !v && resetFlow()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" />
              Pulang lebih dari 60 menit dari jadwal
            </DialogTitle>
            <DialogDescription>
              Jam pulang terjadwal {effectiveShift?.name ? `shift ${effectiveShift.name}` : ""}{" "}
              {effectiveShift?.endTime}. Berikan alasan — HRD akan memutuskan apakah perlu
              persetujuan atasan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Alasan</Label>
              <Input
                className="mt-2"
                value={lateOutReasonText}
                onChange={(e) => setLateOutReasonText(e.target.value)}
                placeholder="Contoh: Menyelesaikan laporan bulanan"
              />
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                disabled={!lateOutReasonText.trim()}
                onClick={() => {
                  setPendingOutReason(lateOutReasonText.trim());
                  proceedToClockOutFace();
                }}
              >
                Lanjutkan ke FaceID
              </Button>
            </DialogFooter>
          </div>
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
                  ...(pending.lateInReason ? { lateInReason: pending.lateInReason } : {}),
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
            reloadSessions();
            onChange();
          }}
        />
      )}

      {/* Step 3: FaceID verification for Clock Out too — confirms it's really this person leaving */}
      {dialog === "verify-out" && employee.faceDescriptor && (
        <FaceCaptureDialog
          open
          mode="verify"
          employeeName={employee.fullName}
          enrolledDescriptor={employee.faceDescriptor}
          onClose={resetFlow}
          onVerified={async (result) => {
            if (result.matched) {
              await performClockOut(result.photoDataUrl, pendingOutReason);
            } else {
              toast.error(
                `Wajah tidak cocok (jarak ${result.distance.toFixed(2)}). Clock-out ditolak.`,
              );
              resetFlow();
            }
          }}
        />
      )}
    </div>
  );
}
