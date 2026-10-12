"use client";

import { BicepsFlexed, Camera, ChevronLeft, ChevronRight, Droplet, Leaf, Plus, UtensilsCrossed, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { total, itemAmountLabel, mealTypes, type Meal, type MealType, type Profile } from "@/lib/food";
import { addCalendarDays, mondayOf } from "@/lib/weekly-progress";

const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");
const localDate = (date: string) => new Date(`${date}T12:00:00`);
type Props = { date: string; today: string; profile: Profile; target: number; meals: Meal[]; account: boolean; onDate: (date: string) => void; onAdd: (type?: MealType) => void; onPhoto: () => void; onHistory: () => void; onMeal: (meal: Meal) => void };

export function MealEntry({ meal, onClick }: { meal: Meal; onClick: () => void }) {
  return <button className="fc-meal-entry" onClick={onClick}>
    <span className="fc-food-thumb" aria-hidden="true"><UtensilsCrossed size={23} /></span>
    <span className="fc-meal-text"><strong>{meal.title}</strong><small>{meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : meal.type} · {meal.items.length === 1 ? itemAmountLabel(meal.items[0]) : `${meal.items.length} komponen`}</small><small>{meal.method === "foto" ? "Dari foto · ditinjau" : meal.method === "tersimpan" ? "Makanan tersimpan" : "Dicatat manual"}</small></span>
    <span className="fc-meal-calories">{number(total(meal.items).calories)}<small>kkal</small></span>
  </button>;
}

export default function HomeDashboard(props: Props) {
  const nutrition = props.meals.length ? total(props.meals.flatMap((meal) => meal.items)) : { calories: null, protein: null, carbs: null, fat: null };
  const percent = nutrition.calories === null ? 0 : Math.min(100, nutrition.calories / Math.max(1, props.target) * 100);
  const remaining = nutrition.calories === null ? null : props.target - nutrition.calories;
  const week = mondayOf(props.date);
  const macros = [
    { label: "Protein", value: nutrition.protein, target: Math.round(props.profile.weight * 1.2), Icon: BicepsFlexed, tone: "protein" },
    { label: "Karbohidrat", value: nutrition.carbs, target: Math.round(props.target * .5 / 4), Icon: Wheat, tone: "carbs" },
    { label: "Lemak", value: nutrition.fat, target: Math.round(props.target * .3 / 9), Icon: Droplet, tone: "fat" },
  ];
  return <div className="fc-home">
    <div className="fc-greeting"><div><h1>Halo{props.profile.name ? `, ${props.profile.name}` : ""}!</h1><p>Makan enak, catat dengan tenang <Leaf size={14} /></p></div><Badge variant="secondary">{props.account ? "Tersinkron" : "Demo lokal"}</Badge></div>
    <div className="fc-date-heading"><span>{localDate(props.date).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span><div><Button variant="ghost" size="icon" aria-label="Minggu sebelumnya" onClick={() => props.onDate(addCalendarDays(props.date, -7))}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Minggu berikutnya" disabled={addCalendarDays(week, 7) > props.today} onClick={() => props.onDate(addCalendarDays(props.date, 7) > props.today ? props.today : addCalendarDays(props.date, 7))}><ChevronRight /></Button></div></div>
    <div className="fc-week" aria-label="Pilih tanggal">{Array.from({ length: 7 }, (_, index) => { const date = addCalendarDays(week, index); return <button key={date} aria-pressed={date === props.date} disabled={date > props.today} className={date === props.date ? "selected" : ""} onClick={() => props.onDate(date)}><span>{localDate(date).toLocaleDateString("id-ID", { weekday: "short" })}</span><strong>{localDate(date).getDate()}</strong><i className={date === props.today ? "is-today" : ""} /></button>; })}</div>
    <Card className="fc-calorie-summary"><div className="fc-calorie-ring" style={{ "--percent": `${percent}%` } as React.CSSProperties}><div><strong>{number(nutrition.calories)}</strong><span>kkal</span></div></div><div className="fc-calorie-copy"><h2>{props.date === props.today ? "Kalori hari ini" : "Kalori tercatat"}</h2><p>dari {number(props.target)} kkal</p><Progress value={percent} aria-label="Kalori terhadap target" /><small>{remaining === null ? "Belum ada catatan" : remaining >= 0 ? `${number(remaining)} kkal hingga target` : `${number(-remaining)} kkal di atas target`}</small></div></Card>
    <div className="fc-macros">{macros.map(({ label, value, target, Icon, tone }) => <Card className={`fc-macro fc-${tone}`} key={label}><span className="fc-macro-icon"><Icon size={17} /></span><h3>{label}</h3><strong>{number(value)} <small>g</small></strong><p>dari {number(target)} g</p><Progress value={value === null ? 0 : Math.min(100, value / Math.max(1, target) * 100)} aria-label={`${label} terhadap target`} /></Card>)}</div>
    <div className="fc-section-title"><h2>Makanan {props.date === props.today ? "hari ini" : "tercatat"}</h2><Button variant="ghost" onClick={props.onHistory}>Lihat semua <ChevronRight size={15} /></Button></div>
    {!props.meals.length && <Card className="fc-empty"><UtensilsCrossed size={28} /><h3>Belum ada catatan</h3><p>Mulai dari satu makanan. Hari tanpa catatan belum menggambarkan asupanmu.</p><Button onClick={() => props.onAdd()}><Plus size={17} /> Catat makanan</Button></Card>}
    {mealTypes.map((type) => { const entries = props.meals.filter((meal) => meal.type === type); return <section className="fc-meal-group" key={type}><div><h3>{type}</h3><Button variant="ghost" size="icon" aria-label={`Tambah ${type.toLowerCase()}`} onClick={() => props.onAdd(type)}><Plus size={17} /></Button></div>{entries.map((meal) => <MealEntry meal={meal} key={meal.id} onClick={() => props.onMeal(meal)} />)}{!entries.length && <p>Belum ada catatan</p>}</section>; })}
    <Card className="fc-scan-prompt"><span><Camera size={24} /></span><div><h3>Mulai dari sebuah foto</h3><p>Kenali makanan, lalu tinjau estimasinya.</p></div><Button variant="ghost" size="icon" aria-label="Analisis foto makanan" onClick={props.onPhoto}><ChevronRight /></Button></Card>
    <p className="fc-footnote">Nilai gizi merupakan estimasi. {props.account ? "Catatan tersimpan di akunmu." : "Mode demo menyimpan catatan di perangkat ini."}</p>
  </div>;
}
