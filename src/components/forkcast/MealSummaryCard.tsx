"use client";

import { useState } from "react";
import Image from "next/image";
import { BicepsFlexed, Droplet, UtensilsCrossed, Wheat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { total, type MealItem } from "@/lib/food";
import { tr, useLanguage } from "@/lib/language";

const value = (amount: number | null, locale: string) => amount === null ? "—" : Math.round(amount).toLocaleString(locale);

export default function MealSummaryCard({ title, time, items, image, onClick }: { title: string; time: string; items: MealItem[]; image?: string; onClick: () => void }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const { language } = useLanguage();
  const nutrients = total(items);
  return <Card className="fc-summary-card"><button type="button" className="fc-summary-card-button" onClick={onClick} aria-label={`${tr(language, "Lihat", "View")} ${title}, ${value(nutrients.calories, language)} ${tr(language, "kilokalori", "kilocalories")}`}>
    <span className="fc-summary-thumbnail" aria-hidden="true">{image && image !== failedImage ? <Image src={image} alt="" fill sizes="88px" unoptimized onError={() => setFailedImage(image)} /> : <UtensilsCrossed size={24} />}</span>
    <span className="fc-summary-content"><strong>{title}</strong><small>{time}</small><span className="fc-summary-calories">{value(nutrients.calories, language)} <small>{tr(language, "kkal", "kcal")}</small></span><span className="fc-summary-macros">
      <span aria-label={`Protein ${value(nutrients.protein, language)} gram`}><BicepsFlexed size={13} /> Protein {value(nutrients.protein, language)} g</span>
      <span aria-label={`${tr(language, "Karbohidrat", "Carbs")} ${value(nutrients.carbs, language)} gram`}><Wheat size={13} /> {tr(language, "Karbo", "Carbs")} {value(nutrients.carbs, language)} g</span>
      <span aria-label={`${tr(language, "Lemak", "Fat")} ${value(nutrients.fat, language)} gram`}><Droplet size={13} /> {tr(language, "Lemak", "Fat")} {value(nutrients.fat, language)} g</span>
    </span></span>
  </button></Card>;
}
