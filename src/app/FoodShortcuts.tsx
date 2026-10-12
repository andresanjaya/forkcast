"use client";

import { Plus } from "lucide-react";
import { itemAmountLabel, type MealItem } from "@/lib/food";
import type { FoodShortcut } from "@/lib/meal-memory";

type Props = { recent: FoodShortcut[]; frequent: FoodShortcut[]; onAdd: (item: MealItem) => void };

export default function FoodShortcuts(props: Props) {
  return <div className="memory-search-shortcuts">
    <h4>Terakhir dicatat</h4>
    {props.recent.length ? <div className="memory-shortcut-list">{props.recent.slice(0, 4).map((entry) => <button key={entry.key} onClick={() => props.onAdd(entry.item)}><span><strong>{entry.item.name}</strong><small>Porsi terakhir {itemAmountLabel(entry.item)}</small></span><Plus size={15} /></button>)}</div> : <p className="empty-inline">Belum ada makanan terakhir.</p>}
    <h4>Sering dicatat · 30 hari</h4>
    {props.frequent.length ? <div className="memory-shortcut-list">{props.frequent.slice(0, 4).map((entry) => <button key={entry.key} onClick={() => props.onAdd(entry.item)}><span><strong>{entry.item.name}</strong><small>{entry.count} kali · porsi terakhir {itemAmountLabel(entry.item)}</small></span><Plus size={15} /></button>)}</div> : <p className="empty-inline">Belum ada makanan berulang.</p>}
  </div>;
}
