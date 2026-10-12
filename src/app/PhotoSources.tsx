"use client";

import Image from "next/image";
import { Camera, Upload } from "lucide-react";

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
  return <>
    <div className="photo-sources" aria-label="Sumber foto">
      <button type="button" className="photo-source" disabled={props.analyzing} onClick={props.onCamera}><Camera size={22} /><strong>Ambil foto</strong><small>Buka kamera Forkcast</small></button>
      <label className="photo-source"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={props.analyzing} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; props.onGallery(file); }} /><Upload size={22} /><strong>{props.galleryFile ? "Ganti foto dari galeri" : "Pilih dari galeri"}</strong><small>Gunakan foto yang tersimpan</small></label>
    </div>
    {props.galleryPreview && <div className="gallery-preview">
      {props.galleryPreview && <Image src={props.galleryPreview} alt="Pratinjau foto makanan" width={480} height={360} unoptimized onError={props.onPreviewError} />}
      <div><strong>{props.photoName}</strong><small>Foto hanya dipakai untuk analisis dan tidak disimpan sebagai catatan.</small></div>
      {props.galleryFile && <div className="gallery-actions"><button className="primary-button" type="button" disabled={props.analyzing || props.analysisReady} onClick={props.onAnalyze}>{props.analyzing ? "Menganalisis..." : props.analysisReady ? "Analisis selesai" : "Analisis foto"}</button><button className="outline-button" type="button" disabled={props.analyzing} onClick={props.onCancel}>Batalkan</button></div>}
    </div>}
    <p className="microcopy" aria-live="polite">{props.analyzing ? "Sedang melihat foto..." : props.photoName ? `Foto dipilih: ${props.photoName}` : "JPEG, PNG, atau WebP · maksimal 8 MB"}</p>
    <p className="microcopy">Jika akses kamera atau galeri ditolak, periksa izin perangkat atau gunakan pencarian manual.</p>
  </>;
}
