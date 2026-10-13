"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { BrowserMultiFormatOneDReader, type IScannerControls } from "@zxing/browser";
import { Barcode, Camera, CircleHelp, ImageIcon, Lightbulb, X } from "lucide-react";
import { normalizeBarcode } from "@/lib/packaged-food";
import { tr, useLanguage } from "@/lib/language";
import { Field, FieldLabel } from "@/components/ui/field";

export type CameraMode = "food" | "barcode" | "label";

type Props = {
  initialMode?: CameraMode;
  onClose: () => void;
  onCapture: (file: File, mode: CameraMode) => void;
  onBarcode: (code: string) => void;
  onGallery: (file: File) => void;
};

export default function CameraCapture({ initialMode = "food", onClose, onCapture, onBarcode, onGallery }: Props) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const callbacksRef = useRef({ onClose, onCapture, onBarcode, onGallery });
  const [mode, setMode] = useState<CameraMode>(initialMode);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => { callbacksRef.current = { onClose, onCapture, onBarcode, onGallery }; }, [onClose, onCapture, onBarcode, onGallery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") callbacksRef.current.onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    const video = videoRef.current;
    if (!navigator.mediaDevices?.getUserMedia || !video) {
      setError(tr(language, "Kamera langsung tidak tersedia. Izinkan akses kamera atau pilih foto dari galeri.", "Live camera is unavailable. Allow camera access or choose a photo from your gallery."));
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        video.srcObject = stream;
        return video.play().then(() => setCameraReady(true));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const name = reason && typeof reason === "object" && "name" in reason ? String(reason.name) : "";
        setError(name === "NotAllowedError" ? tr(language, "Izin kamera belum diberikan. Izinkan akses kamera atau pilih foto dari galeri.", "Camera permission was not granted. Allow access or choose a photo from your gallery.") : name === "NotFoundError" ? tr(language, "Kamera tidak ditemukan. Pilih foto dari galeri.", "No camera found. Choose a photo from your gallery.") : tr(language, "Kamera tidak dapat dibuka. Tutup aplikasi lain yang sedang memakai kamera atau pilih foto dari galeri.", "Camera could not open. Close other apps using it or choose a photo from your gallery."));
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [language]);

  useEffect(() => {
    if (mode !== "barcode" || !cameraReady || !videoRef.current || !streamRef.current) return;
    let active = true;
    let controls: IScannerControls | null = null;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
    const reader = new BrowserMultiFormatOneDReader(hints);
    reader.decodeFromVideoElement(videoRef.current, (result, _error, currentControls) => {
      if (!active || !result) return;
      const code = normalizeBarcode(result.getText());
      if (!code) return;
      active = false;
      currentControls.stop();
      controls?.stop();
      callbacksRef.current.onBarcode(code);
    }).then((currentControls) => { controls = currentControls; if (!active) currentControls.stop(); }).catch(() => {
      if (active) setError(tr(language, "Barcode belum terbaca. Atur cahaya, posisikan kode di dalam bingkai, atau pindai ulang.", "Barcode could not be read. Adjust the light, align the code in the frame, or scan again."));
    });
    return () => { active = false; controls?.stop(); };
  }, [cameraReady, mode, language]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean } | undefined;
    if (!track || !capabilities?.torch) { setError(tr(language, "Flash tidak tersedia pada kamera ini.", "Flash is unavailable on this camera.")); return; }
    try {
      const next = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setFlashOn(next); setError("");
    } catch { setError(tr(language, "Flash tidak dapat diubah pada perangkat ini.", "Flash could not be changed on this device.")); }
  }, [flashOn, language]);

  const changeZoom = useCallback(async (next: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } } | undefined;
    if (track && capabilities?.zoom && next >= capabilities.zoom.min && next <= capabilities.zoom.max) {
      try { await track.applyConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] }); } catch { /* Keep the camera's default zoom. */ }
    }
    setZoom(next);
  }, []);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || capturing) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1800 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error(tr(language, "Foto tidak dapat diambil. Coba lagi.", "Photo could not be captured. Try again."));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(tr(language, "Foto tidak dapat disimpan. Coba lagi.", "Photo could not be saved. Try again."))), "image/jpeg", .88));
      callbacksRef.current.onCapture(new File([blob], `forkcast-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() }), mode);
    } catch (reason) { setError(reason instanceof Error ? reason.message : tr(language, "Foto tidak dapat diambil. Coba lagi.", "Photo could not be captured. Try again.")); }
    finally { setCapturing(false); }
  }

  const modeLabel = mode === "food" ? tr(language, "Arahkan makanan ke dalam bingkai", "Place the food inside the frame") : mode === "barcode" ? tr(language, "Sejajarkan barcode di dalam bingkai", "Align the barcode inside the frame") : tr(language, "Pastikan label gizi terlihat jelas", "Make sure the nutrition label is clear");

  return <section className="fc-camera" role="dialog" aria-modal="true" aria-label={tr(language, "Kamera makanan", "Food camera")}>
    <video ref={videoRef} className="fc-camera-video" autoPlay muted playsInline aria-label={tr(language, "Pratinjau kamera", "Camera preview")} />
    <div className="fc-camera-shade" aria-hidden="true" />
    <header className="fc-camera-header"><button type="button" aria-label={tr(language, "Tutup kamera", "Close camera")} onClick={onClose}><X /></button><span className="fc-camera-grabber" aria-hidden="true" /><button type="button" aria-label={tr(language, "Bantuan kamera", "Camera help")} onClick={() => setHelpOpen(true)}><CircleHelp /></button></header>
    <div className={`fc-camera-frame ${mode === "barcode" ? "is-barcode" : ""}`} aria-hidden="true"><i /><i /><i /><i /></div>
    <p className="fc-camera-hint" aria-live="polite">{error || modeLabel}</p>
    <div className="fc-camera-controls">
      <div className="fc-camera-zoom" aria-label={tr(language, "Zoom kamera", "Camera zoom")}><button type="button" aria-pressed={zoom === .5} onClick={() => void changeZoom(.5)}>.5x</button><button type="button" aria-pressed={zoom === 1} onClick={() => void changeZoom(1)}>1x</button></div>
      <div className="fc-camera-modes" role="tablist" aria-label={tr(language, "Mode kamera", "Camera mode")}>
        <button type="button" role="tab" aria-selected={mode === "food"} onClick={() => { setMode("food"); setError(""); }}><Camera /><span>{tr(language, "Scan makanan", "Scan food")}</span></button>
        <button type="button" role="tab" aria-selected={mode === "barcode"} onClick={() => { setMode("barcode"); setError(""); }}><Barcode /><span>Barcode</span></button>
        <button type="button" role="tab" aria-selected={mode === "label"} onClick={() => { setMode("label"); setError(""); }}><ImageIcon /><span>{tr(language, "Label gizi", "Food label")}</span></button>
      </div>
      <div className="fc-camera-shutter-row"><button type="button" className={`fc-camera-round ${flashOn ? "is-on" : ""}`} onClick={() => void toggleFlash()} aria-label={tr(language, "Nyalakan atau matikan flash", "Toggle flash")}><Lightbulb /></button>{mode === "barcode" ? <span className="fc-camera-barcode-status">{tr(language, "Memindai barcode…", "Scanning barcode…")}</span> : <button type="button" className="fc-camera-shutter" onClick={() => void takePhoto()} disabled={!cameraReady || capturing} aria-label={mode === "label" ? tr(language, "Ambil foto label gizi", "Capture food label") : tr(language, "Ambil foto makanan", "Capture food photo")}><span /></button>}<button type="button" className="fc-camera-round" onClick={() => galleryRef.current?.click()} aria-label={tr(language, "Pilih foto dari galeri", "Choose photo from gallery")}><ImageIcon /></button></div>
    </div>
    <Field className="sr-only"><FieldLabel htmlFor="camera-gallery-file">{tr(language, "Pilih foto dari galeri", "Choose photo from gallery")}</FieldLabel><input id="camera-gallery-file" ref={galleryRef} className="fc-camera-gallery" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) callbacksRef.current.onGallery(file); }} /></Field>
    {helpOpen && <div className="fc-camera-help"><div><h2>{tr(language, "Cara memakai kamera", "How to use the camera")}</h2><p>{tr(language, "Scan makanan untuk memperkirakan makanan dan porsinya. Barcode mencari produk kemasan. Label gizi membantu membaca foto makanan atau label sebagai saran yang tetap perlu diperiksa.", "Scan food to estimate its foods and portions. Barcode finds packaged products. Food label reads a photo or label as suggestions that still need review.")}</p><button type="button" onClick={() => setHelpOpen(false)}>{tr(language, "Mengerti", "Got it")}</button></div></div>}
    {error && <button type="button" className="fc-camera-error-close" onClick={() => setError("")}>{tr(language, "Tutup pesan", "Dismiss message")}</button>}
  </section>;
}
