"use client";

import Image from "next/image";
import { Camera, Upload } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { tr, useLanguage } from "@/lib/language";

type Props = {
  analyzing: boolean;
  galleryFile: File | null;
  galleryPreview: string;
  photoName: string;
  analysisReady: boolean;
  onCamera: () => void;
  onGallery: (file: File | undefined) => void;
  onAnalyze: () => void;
  onCancel: () => void;
  onPreviewError: () => void;
};

export default function PhotoSources(props: Props) {
  const { language } = useLanguage();
  return <>
    <div className="photo-sources" aria-label={tr(language, "Sumber foto", "Photo source")}>
      <button type="button" className="photo-source" disabled={props.analyzing} onClick={props.onCamera}><Camera size={22} /><strong>{tr(language, "Ambil foto", "Take photo")}</strong><small>{tr(language, "Buka kamera Forkcast", "Open Forkcast camera")}</small></button>
      <Field><FieldLabel className="photo-source"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={props.analyzing} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; props.onGallery(file); }} /><Upload size={22} /><strong>{props.galleryFile ? tr(language, "Ganti foto dari galeri", "Replace gallery photo") : tr(language, "Pilih dari galeri", "Choose from gallery")}</strong><small>{tr(language, "Gunakan foto yang tersimpan", "Use a saved photo")}</small></FieldLabel></Field>
    </div>
    {props.galleryPreview && <div className="gallery-preview">
      {props.galleryPreview && <Image src={props.galleryPreview} alt={tr(language, "Pratinjau foto makanan", "Food photo preview")} width={480} height={360} unoptimized onError={props.onPreviewError} />}
      <div><strong>{props.photoName}</strong><small>{tr(language, "Foto akan disimpan bersama catatan makan setelah kamu menekan Simpan catatan.", "The photo will be saved with the meal when you press Save log.")}</small></div>
      {props.galleryFile && <div className="gallery-actions"><button className="primary-button" type="button" disabled={props.analyzing || props.analysisReady} onClick={props.onAnalyze}>{props.analyzing ? tr(language, "Menganalisis...", "Analyzing...") : props.analysisReady ? tr(language, "Analisis selesai", "Analysis complete") : tr(language, "Analisis foto", "Analyze photo")}</button><button className="outline-button" type="button" disabled={props.analyzing} onClick={props.onCancel}>{tr(language, "Batalkan", "Cancel")}</button></div>}
    </div>}
    <p className="microcopy" aria-live="polite">{props.analyzing ? tr(language, "Sedang melihat foto...", "Reviewing photo...") : props.photoName ? `${tr(language, "Foto dipilih", "Selected photo")}: ${props.photoName}` : tr(language, "JPEG, PNG, atau WebP · maksimal 8 MB", "JPEG, PNG, or WebP · up to 8 MB")}</p>
    <p className="microcopy">{tr(language, "Jika akses kamera atau galeri ditolak, periksa izin perangkat atau gunakan pencarian manual.", "If camera or gallery access is denied, check device permissions or use manual search.")}</p>
  </>;
}
