/**
 * FaceID helper built on face-api.js. Models are loaded lazily (and only
 * once) from a CDN, since the ~6MB of weight files aren't worth bundling
 * into the app itself.
 *
 * Flow:
 *  - enrollFace(video)  -> 128-length descriptor, saved once per employee
 *  - verifyFace(video, enrolledDescriptor) -> { matched, distance }
 */
import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

/** Below this Euclidean distance, two descriptors are considered the same face. */
export const FACE_MATCH_THRESHOLD = 0.55;

let modelsLoaded: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!modelsLoaded) {
    modelsLoaded = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsLoaded;
}

/** Detects the single most prominent face in a video frame and returns its 128-d descriptor. */
export async function captureFaceDescriptor(video: HTMLVideoElement): Promise<Float32Array | null> {
  await loadFaceModels();
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

export function descriptorDistance(a: number[], b: Float32Array): number {
  return faceapi.euclideanDistance(a, Array.from(b));
}

/** Snapshot the current video frame to a downscaled JPEG data URL (attendance proof photo). */
export function snapshotToDataUrl(video: HTMLVideoElement, maxWidth = 320): string {
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

