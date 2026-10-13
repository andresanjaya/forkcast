"use client";

import { useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { tr, useLanguage } from "@/lib/language";

export default function FoodPhotoHeader({ src, name }: { src?: string; name: string }) {
  const { language } = useLanguage();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const visible = Boolean(src && src !== failedSrc);
  return <div className={`fc-photo-header${visible ? " has-photo" : ""}`}>{visible ? <Image src={src!} alt={name} fill sizes="(max-width: 430px) 100vw, 430px" unoptimized onError={() => setFailedSrc(src ?? null)} /> : <div><UtensilsCrossed size={48} strokeWidth={1.3} /><span>{tr(language, "Foto belum tersedia", "Photo unavailable")}</span></div>}</div>;
}
