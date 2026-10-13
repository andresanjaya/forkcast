"use client";

import { useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";

export default function FoodPhotoHeader({ src, name }: { src?: string; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const visible = Boolean(src && src !== failedSrc);
  return <div className={`fc-photo-header${visible ? " has-photo" : ""}`}>{visible ? <Image src={src!} alt={name} width={800} height={500} unoptimized onError={() => setFailedSrc(src ?? null)} /> : <div><UtensilsCrossed size={48} strokeWidth={1.3} /><span>Foto belum tersedia</span></div>}</div>;
}
