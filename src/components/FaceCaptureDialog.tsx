import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ScanFace } from "lucide-react";
import {
  captureFaceDescriptor,
  descriptorDistance,
  loadFaceModels,
  snapshotToDataUrl,
  FACE_MATCH_THRESHOLD,
} from "@/lib/face-recognition";

type EnrollResult = { descriptor: number[]; photoDataUrl: string };
type VerifyResult = {
  matched: boolean;
  distance: number;
  descriptor: number[];
  photoDataUrl: string;
};

type Props =
  | {
      open: boolean;
      mode: "enroll";
      employeeName: string;
      onClose: () => void;
      onEnrolled: (result: EnrollResult) => void;
    }
  | {
      open: boolean;
      mode: "verify";
      employeeName: string;
      enrolledDescriptor: number[];
      onClose: () => void;
      onVerified: (result: VerifyResult) => void;
    };

export function FaceCaptureDialog(props: Props) {
  const { open, mode, employeeName, onClose } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNotice(null);
    setCameraError(null);
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setCameraError("Gagal memuat model FaceID. Periksa koneksi internet."));

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError("Tidak bisa mengakses kamera. Izinkan akses kamera di browser."));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setBusy(true);
    setNotice(null);
    try {
      const descriptor = await captureFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setNotice("Wajah tidak terdeteksi. Pastikan wajah terlihat jelas dan coba lagi.");
        setBusy(false);
        return;
      }
      const photoDataUrl = snapshotToDataUrl(videoRef.current);

      if (mode === "enroll") {
        props.onEnrolled({ descriptor: Array.from(descriptor), photoDataUrl });
        return;
      }

      const distance = descriptorDistance(props.enrolledDescriptor, descriptor);
      const matched = distance < FACE_MATCH_THRESHOLD;
      props.onVerified({ matched, distance, descriptor: Array.from(descriptor), photoDataUrl });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="size-5 text-primary" />
            {mode === "enroll" ? "Daftarkan Wajah" : "Verifikasi FaceID"}
          </DialogTitle>
          <DialogDescription>
            {mode === "enroll"
              ? `Ambil foto wajah ${employeeName} sebagai referensi FaceID untuk absensi.`
              : `Posisikan wajah ${employeeName} di depan kamera untuk verifikasi kehadiran.`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-square w-64 overflow-hidden rounded-2xl border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full scale-x-[-1] object-cover"
          />
          {!modelsReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-xs text-white">
              <Loader2 className="size-5 animate-spin" />
              Memuat model FaceID…
            </div>
          )}
        </div>

        {cameraError && <p className="text-center text-sm text-destructive">{cameraError}</p>}
        {notice && <p className="text-center text-sm text-amber-500">{notice}</p>}

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleCapture} disabled={!modelsReady || !!cameraError || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            Ambil &amp; {mode === "enroll" ? "Daftarkan" : "Verifikasi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
