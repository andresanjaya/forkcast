"use client";
import { useState } from "react";
import { Barcode, Bookmark, Camera, ImageIcon, Pencil, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { itemAmountLabel, itemFromFood, nutrientsFor, searchPhotoFoods, type MealItem } from "@/lib/food";
import type { FoodShortcut } from "@/lib/meal-memory";
type Props = { recent: FoodShortcut[]; onCamera: () => void; onGallery: (file: File) => void; onMode: (mode: "katalog" | "barcode" | "manual" | "tersimpan") => void; onAdd: (item: MealItem) => void };
export default function LogFoodLanding(props: Props) {
  const [query, setQuery] = useState("");
  const results = query.trim() ? searchPhotoFoods(query).map(itemFromFood) : props.recent.slice(0, 6).map((entry) => entry.item);
  return <div className="fc-log-food"><p className="fc-lead">Catat makanan dengan caramu.</p><div className="fc-photo-choices">
    <button type="button" className="fc-photo-choice" onClick={props.onCamera}><Camera size={30} /><strong>Scan foto</strong><span>Ambil foto makanan langsung</span></button>
    <label className="fc-photo-choice"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) props.onGallery(file); }} /><ImageIcon size={30} /><strong>Pilih dari galeri</strong><span>Gunakan foto dari perangkat</span></label>
  </div><label className="fc-search"><Search size={20} /><span className="sr-only">Cari makanan</span><Input type="search" placeholder="Cari makanan, misalnya nasi goreng..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="fc-section-title"><h2>{query.trim() ? "Hasil pencarian" : "Terakhir dicatat"}</h2><Button variant="ghost" onClick={() => props.onMode("katalog")}>Katalog</Button></div>
  {results.length ? <div className="fc-log-results">{results.map((item) => <div key={item.id}><span className="fc-food-thumb"><UtensilsCrossed size={21} /></span><span><strong>{item.name}</strong><small>{itemAmountLabel(item)} · {nutrientsFor(item).calories === null ? "?" : Math.round(nutrientsFor(item).calories!)} kkal</small></span><Button size="icon" aria-label={`Tambahkan ${item.name}`} onClick={() => props.onAdd({ ...item, id: crypto.randomUUID() })}><Plus /></Button></div>)}</div> : <Card className="fc-search-empty"><p>{query.trim() ? "Makanan belum ditemukan. Coba kata lain atau isi manual." : "Makanan yang pernah kamu catat akan muncul di sini."}</p><Button variant="outline" onClick={() => props.onMode(query.trim() ? "manual" : "katalog")}>{query.trim() ? "Input manual" : "Jelajahi katalog"}</Button></Card>}
  <h2 className="fc-other-title">Cara lain menambahkan</h2><div className="fc-other-actions"><Button variant="outline" onClick={() => props.onMode("barcode")}><Barcode size={25} /><span><strong>Scan barcode</strong><small>Pindai kemasan makanan</small></span></Button><Button variant="outline" onClick={() => props.onMode("manual")}><Pencil size={24} /><span><strong>Input manual</strong><small>Isi nama dan nilai gizi</small></span></Button></div><Button variant="ghost" className="fc-saved-link" onClick={() => props.onMode("tersimpan")}><Bookmark size={18} /> Makanan tersimpan</Button></div>;
}
