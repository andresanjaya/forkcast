"use client";

import Image from "next/image";
import { AlertCircle, ArrowRight, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RecentScanCard({ preview, fileName, status, itemCount, onOpen, onRetry, onDismiss }: {
  preview: string;
  fileName: string;
  status: "processing" | "ready" | "error";
  itemCount: number;
  onOpen: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const content = <>
    <span className={`fc-scan-card-image${status === "processing" ? " is-blurred" : ""}`}>
      {preview ? <Image src={preview} alt="Foto makanan yang dianalisis" fill sizes="112px" unoptimized /> : <span className="fc-scan-card-image-fallback">Forkcast</span>}
      {status === "processing" && <span className="fc-scan-card-spinner"><LoaderCircle className="fc-spin" size={30} /><small>Memeriksa</small></span>}
    </span>
    <span className="fc-scan-card-copy">
      {status === "processing" ? <><strong>Menganalisis makanan…</strong><span className="fc-scan-skeleton" /><span className="fc-scan-skeleton short" /><small>Hasil akan muncul di sini setelah selesai.</small></> : status === "error" ? <><strong>Analisis belum selesai</strong><small>{fileName}</small><small>Foto tetap di perangkat. Coba lagi atau tutup kartu ini.</small><Button size="sm" onClick={(event) => { event.stopPropagation(); onRetry(); }}><RotateCcw size={14} /> Coba lagi</Button></> : <><strong>Hasil scan siap ditinjau</strong><small>{fileName}</small><small>{itemCount} bahan terdeteksi · estimasi AI</small><span className="fc-scan-card-open">Tinjau bahan <ArrowRight size={15} /></span></>}
    </span>
    {status !== "processing" && <Button variant="ghost" size="icon" className="fc-scan-card-dismiss" aria-label="Tutup hasil scan" onClick={(event) => { event.stopPropagation(); onDismiss(); }}><X size={17} /></Button>}
  </>;

  return <Card className={`fc-recent-scan-card is-${status}`}>
    {status === "ready" ? <button className="fc-scan-card-button" type="button" onClick={onOpen}>{content}</button> : <div className="fc-scan-card-button">{content}</div>}
    {status === "error" && <span className="fc-scan-error-icon" aria-hidden="true"><AlertCircle size={17} /></span>}
  </Card>;
}
