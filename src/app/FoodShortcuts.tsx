"use client";

import { Plus } from "lucide-react";
import { itemAmountLabel, type MealItem } from "@/lib/food";
import type { FoodShortcut } from "@/lib/meal-memory";
import { tr, useLanguage } from "@/lib/language";

type Props = { recent: FoodShortcut[]; frequent: FoodShortcut[]; onAdd: (item: MealItem) => void };

export default function FoodShortcuts(props: Props) {
  const { language } = useLanguage();
  return <div className="memory-search-shortcuts">
    <h4>{tr(language, "Terakhir dicatat", "Recently logged")}</h4>
    {props.recent.length ? <div className="memory-shortcut-list">{props.recent.slice(0, 4).map((entry) => <button key={entry.key} onClick={() => props.onAdd(entry.item)}><span><strong>{entry.item.name}</strong><small>{tr(language, "Porsi terakhir", "Last portion")} {itemAmountLabel(entry.item)}</small></span><Plus size={15} /></button>)}</div> : <p className="empty-inline">{tr(language, "Belum ada makanan terakhir.", "No recently logged foods.")}</p>}
    <h4>{tr(language, "Sering dicatat · 30 hari", "Frequently logged · 30 days")}</h4>
    {props.frequent.length ? <div className="memory-shortcut-list">{props.frequent.slice(0, 4).map((entry) => <button key={entry.key} onClick={() => props.onAdd(entry.item)}><span><strong>{entry.item.name}</strong><small>{entry.count} {tr(language, "kali · porsi terakhir", "times · last portion")} {itemAmountLabel(entry.item)}</small></span><Plus size={15} /></button>)}</div> : <p className="empty-inline">{tr(language, "Belum ada makanan berulang.", "No frequently logged foods yet.")}</p>}
  </div>;
}
