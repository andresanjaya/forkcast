"use client";

import Image from "next/image";
import { AlertCircle, ArrowRight, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { tr, useLanguage } from "@/lib/language";

export default function RecentScanCard({ preview, fileName, status, itemCount, onOpen, onRetry, onDismiss }: {
  preview: string;
  fileName: string;
  status: "processing" | "ready" | "error";
  itemCount: number;
  onOpen: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const { language } = useLanguage();
  const content = <>
    <span className={`fc-scan-card-image${status === "processing" ? " is-blurred" : ""}`}>
      {preview ? <Image src={preview} alt={tr(language, "Foto makanan yang dianalisis", "Food photo being analyzed")} fill sizes="112px" unoptimized /> : <span className="fc-scan-card-image-fallback">Forkcast</span>}
      {status === "processing" && <span className="fc-scan-card-spinner"><LoaderCircle className="fc-spin" size={30} /><small>{tr(language, "Memeriksa", "Checking")}</small></span>}
    </span>
    <span className="fc-scan-card-copy">
      {status === "processing" ? <><strong>{tr(language, "Menganalisis makanan…", "Analyzing food…")}</strong><span className="fc-scan-skeleton" /><span className="fc-scan-skeleton short" /><small>{tr(language, "Hasil akan muncul di sini setelah selesai.", "Results will appear here when ready.")}</small></> : status === "error" ? <><strong>{tr(language, "Analisis belum selesai", "Analysis incomplete")}</strong><small>{fileName}</small><small>{tr(language, "Foto tetap di perangkat. Coba lagi atau tutup kartu ini.", "The photo stays on this device. Retry or dismiss this card.")}</small><Button size="sm" onClick={(event) => { event.stopPropagation(); onRetry(); }}><RotateCcw size={14} /> {tr(language, "Coba lagi", "Retry")}</Button></> : <><strong>{tr(language, "Hasil scan siap ditinjau", "Scan ready for review")}</strong><small>{fileName}</small><small>{itemCount} {tr(language, "bahan terdeteksi · estimasi AI", "items detected · AI estimate")}</small><span className="fc-scan-card-open">{tr(language, "Tinjau bahan", "Review items")} <ArrowRight size={15} /></span></>}
    </span>
    {status !== "processing" && <Button variant="ghost" size="icon" className="fc-scan-card-dismiss" aria-label={tr(language, "Tutup hasil scan", "Dismiss scan result")} onClick={(event) => { event.stopPropagation(); onDismiss(); }}><X size={17} /></Button>}
  </>;

  return <Card className={`fc-recent-scan-card is-${status}`}>
    {status === "ready" ? <button className="fc-scan-card-button" type="button" onClick={onOpen}>{content}</button> : <div className="fc-scan-card-button">{content}</div>}
    {status === "error" && <span className="fc-scan-error-icon" aria-hidden="true"><AlertCircle size={17} /></span>}
  </Card>;
}
