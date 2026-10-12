"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { BrowserMultiFormatOneDReader, type IScannerControls } from "@zxing/browser";
import { Barcode, Camera, CircleHelp, ImageIcon, Lightbulb, X } from "lucide-react";
import { normalizeBarcode } from "@/lib/packaged-food";

export type CameraMode = "food" | "barcode" | "label";

type Props = {
  initialMode?: CameraMode;
  onClose: () => void;
  onCapture: (file: File, mode: CameraMode) => void;
  onBarcode: (code: string) => void;
  onGallery: (file: File) => void;
};

export default function CameraCapture({ initialMode = "food", onClose, onCapture, onBarcode, onGallery }: Props) {
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
      setError("Kamera langsung tidak tersedia. Izinkan akses kamera atau pilih foto dari galeri.");
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
        setError(name === "NotAllowedError" ? "Izin kamera belum diberikan. Izinkan akses kamera atau pilih foto dari galeri." : name === "NotFoundError" ? "Kamera tidak ditemukan. Pilih foto dari galeri." : "Kamera tidak dapat dibuka. Tutup aplikasi lain yang sedang memakai kamera atau pilih foto dari galeri.");
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, []);

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
      if (active) setError("Barcode belum terbaca. Atur cahaya, posisikan kode di dalam bingkai, atau pindai ulang.");
    });
    return () => { active = false; controls?.stop(); };
  }, [cameraReady, mode]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean } | undefined;
    if (!track || !capabilities?.torch) { setError("Flash tidak tersedia pada kamera ini."); return; }
    try {
      const next = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setFlashOn(next); setError("");
    } catch { setError("Flash tidak dapat diubah pada perangkat ini."); }
  }, [flashOn]);

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
      if (!context) throw new Error("Foto tidak dapat diambil. Coba lagi.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Foto tidak dapat disimpan. Coba lagi.")), "image/jpeg", .88));
      callbacksRef.current.onCapture(new File([blob], `forkcast-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() }), mode);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Foto tidak dapat diambil. Coba lagi."); }
    finally { setCapturing(false); }
  }

  const modeLabel = mode === "food" ? "Arahkan makanan ke dalam bingkai" : mode === "barcode" ? "Sejajarkan barcode di dalam bingkai" : "Pastikan label gizi terlihat jelas";

  return <section className="fc-camera" role="dialog" aria-modal="true" aria-label="Kamera makanan">
    <video ref={videoRef} className="fc-camera-video" autoPlay muted playsInline aria-label="Pratinjau kamera" />
    <div className="fc-camera-shade" aria-hidden="true" />
    <header className="fc-camera-header"><button type="button" aria-label="Tutup kamera" onClick={onClose}><X /></button><span className="fc-camera-grabber" aria-hidden="true" /><button type="button" aria-label="Bantuan kamera" onClick={() => setHelpOpen(true)}><CircleHelp /></button></header>
    <div className={`fc-camera-frame ${mode === "barcode" ? "is-barcode" : ""}`} aria-hidden="true"><i /><i /><i /><i /></div>
    <p className="fc-camera-hint" aria-live="polite">{error || modeLabel}</p>
    <div className="fc-camera-controls">
      <div className="fc-camera-zoom" aria-label="Zoom kamera"><button type="button" aria-pressed={zoom === .5} onClick={() => void changeZoom(.5)}>.5x</button><button type="button" aria-pressed={zoom === 1} onClick={() => void changeZoom(1)}>1x</button></div>
      <div className="fc-camera-modes" role="tablist" aria-label="Mode kamera">
        <button type="button" role="tab" aria-selected={mode === "food"} onClick={() => { setMode("food"); setError(""); }}><Camera /><span>Scan makanan</span></button>
        <button type="button" role="tab" aria-selected={mode === "barcode"} onClick={() => { setMode("barcode"); setError(""); }}><Barcode /><span>Barcode</span></button>
        <button type="button" role="tab" aria-selected={mode === "label"} onClick={() => { setMode("label"); setError(""); }}><ImageIcon /><span>Label gizi</span></button>
      </div>
      <div className="fc-camera-shutter-row"><button type="button" className={`fc-camera-round ${flashOn ? "is-on" : ""}`} onClick={() => void toggleFlash()} aria-label="Nyalakan atau matikan flash"><Lightbulb /></button>{mode === "barcode" ? <span className="fc-camera-barcode-status">Memindai barcode…</span> : <button type="button" className="fc-camera-shutter" onClick={() => void takePhoto()} disabled={!cameraReady || capturing} aria-label={mode === "label" ? "Ambil foto label gizi" : "Ambil foto makanan"}><span /></button>}<button type="button" className="fc-camera-round" onClick={() => galleryRef.current?.click()} aria-label="Pilih foto dari galeri"><ImageIcon /></button></div>
    </div>
    <input ref={galleryRef} className="fc-camera-gallery" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Pilih foto dari galeri" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) callbacksRef.current.onGallery(file); }} />
    {helpOpen && <div className="fc-camera-help"><div><h2>Cara memakai kamera</h2><p>Scan makanan untuk memperkirakan makanan dan porsinya. Barcode mencari produk kemasan. Label gizi membantu membaca foto makanan atau label sebagai saran yang tetap perlu diperiksa.</p><button type="button" onClick={() => setHelpOpen(false)}>Mengerti</button></div></div>}
    {error && <button type="button" className="fc-camera-error-close" onClick={() => setError("")}>Tutup pesan</button>}
  </section>;
}
