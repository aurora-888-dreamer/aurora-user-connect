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
import { Loader2, Camera, ScanFace, Upload, RotateCcw, Check } from "lucide-react";
import {
  captureFaceDescriptor,
  descriptorDistance,
  loadFaceModels,
  loadImageFile,
  imageToDataUrl,
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

// Holds a captured-but-not-yet-confirmed shot so the person can review it
// before it's actually saved/sent — instead of the old flow where pressing
// the capture button immediately finalized whatever the camera happened to
// see at that instant.
type PendingShot = {
  descriptor: Float32Array;
  photoDataUrl: string;
};

export function FaceCaptureDialog(props: Props) {
  const { open, mode, employeeName, onClose } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingShot, setPendingShot] = useState<PendingShot | null>(null);

  useEffect(() => {
    if (!open) return;
    setNotice(null);
    setCameraError(null);
    setPendingShot(null);
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setCameraError("Gagal memuat model FaceID. Periksa koneksi internet."));

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() =>
        setCameraError(
          'Tidak bisa mengakses kamera. Izinkan akses kamera di browser, atau gunakan tombol "Unggah Foto" di bawah.',
        ),
      );

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const finishWithDescriptor = (descriptor: Float32Array, photoDataUrl: string) => {
    if (mode === "enroll") {
      props.onEnrolled({ descriptor: Array.from(descriptor), photoDataUrl });
      return;
    }
    const distance = descriptorDistance(props.enrolledDescriptor, descriptor);
    const matched = distance < FACE_MATCH_THRESHOLD;
    props.onVerified({ matched, distance, descriptor: Array.from(descriptor), photoDataUrl });
  };

  // Step 1: capture from the live camera, but only stage it for review.
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
      setPendingShot({ descriptor, photoDataUrl });
    } finally {
      setBusy(false);
    }
  };

  // Step 1 (alt): pick from an uploaded file, also staged for review first.
  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      await loadFaceModels();
      const image = await loadImageFile(file);
      const descriptor = await captureFaceDescriptor(image);
      if (!descriptor) {
        setNotice("Wajah tidak terdeteksi di foto ini. Coba foto lain yang lebih jelas.");
        return;
      }
      const photoDataUrl = imageToDataUrl(image);
      setPendingShot({ descriptor, photoDataUrl });
    } catch {
      setNotice("Gagal memproses foto. Coba foto lain.");
    } finally {
      setBusy(false);
    }
  };

  // Step 2: person reviews the staged shot and either retakes or confirms it.
  const handleRetake = () => {
    setPendingShot(null);
    setNotice(null);
  };

  const handleConfirm = () => {
    if (!pendingShot) return;
    finishWithDescriptor(pendingShot.descriptor, pendingShot.photoDataUrl);
  };

  const showingReview = !!pendingShot;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="size-5 text-primary" />
            {mode === "enroll" ? "Daftarkan Wajah" : "Verifikasi FaceID"}
          </DialogTitle>
          <DialogDescription>
            {showingReview
              ? "Periksa dulu hasil fotonya. Kalau kurang jelas, ambil ulang."
              : mode === "enroll"
                ? `Ambil foto wajah ${employeeName} sebagai referensi FaceID untuk absensi.`
                : `Posisikan wajah ${employeeName} di depan kamera untuk verifikasi kehadiran.`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-square w-64 overflow-hidden rounded-2xl border border-border bg-black">
          {showingReview ? (
            // Frozen still of exactly what will be saved — no ambiguity about
            // "which photo actually got taken".
            <img
              src={pendingShot.photoDataUrl}
              alt="Hasil tangkapan wajah"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
          )}
          {!showingReview && !modelsReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-xs text-white">
              <Loader2 className="size-5 animate-spin" />
              Memuat model FaceID…
            </div>
          )}
        </div>

        {cameraError && <p className="text-center text-sm text-destructive">{cameraError}</p>}
        {notice && <p className="text-center text-sm text-amber-500">{notice}</p>}

        <DialogFooter className="sm:flex-col sm:items-stretch sm:justify-center sm:gap-2">
          {showingReview ? (
            <>
              <Button onClick={handleConfirm}>
                <Check className="size-4" />
                Gunakan Foto Ini{mode === "enroll" ? " & Daftarkan" : " & Verifikasi"}
              </Button>
              <Button variant="outline" type="button" onClick={handleRetake}>
                <RotateCcw className="size-4" /> Ambil Ulang
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCapture} disabled={!modelsReady || !!cameraError || busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                Ambil Foto
              </Button>
              {mode === "enroll" && (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4" /> Atau Unggah Foto
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChosen}
                  />
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
