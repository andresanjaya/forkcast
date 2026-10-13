"use client";

import { useEffect, useRef, useState } from "react";
import { BicepsFlexed, Camera, ChevronLeft, ChevronRight, Droplet, Leaf, Plus, UtensilsCrossed, Wheat } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { total, itemAmountLabel, mealTypes, type Meal, type MealType, type Profile } from "@/lib/food";
import { addCalendarDays, mondayOf, targetOnDate } from "@/lib/weekly-progress";
import { activeTarget, type TargetRecord } from "@/lib/target";
import RecentScanCard from "./RecentScanCard";
import MealSummaryCard from "./MealSummaryCard";
import { mealTypeLabel, tr, useLanguage } from "@/lib/language";

const localDate = (date: string) => new Date(`${date}T12:00:00`);
type Props = { date: string; today: string; profile: Profile; target: number; meals: Meal[]; calendarMeals: Meal[]; recentUploads: Meal[]; targets: TargetRecord[]; account: boolean; scan?: { status: "processing" | "ready" | "error"; preview: string; fileName: string; itemCount: number; onOpen: () => void; onRetry: () => void; onDismiss: () => void }; onDate: (date: string) => void; onAdd: (type?: MealType) => void; onPhoto: () => void; onHistory: () => void; onMeal: (meal: Meal) => void };

function MealPhotoThumbnail({ src, className, sizes }: { src?: string; className: string; sizes: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <span className={className} aria-hidden="true">{src && src !== failedSrc ? <Image src={src} alt="" fill sizes={sizes} unoptimized onError={() => setFailedSrc(src)} /> : <UtensilsCrossed size={23} />}</span>;
}

export function MealEntry({ meal, onClick }: { meal: Meal; onClick: () => void }) {
  const { language } = useLanguage();
  const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString(language);
  const amount = meal.items.length === 1 ? itemAmountLabel(meal.items[0]) : `${meal.items.length} ${tr(language, "komponen", "components")}`;
  const time = meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) : mealTypeLabel(language, meal.type);
  return <Card className="fc-meal-entry-card">
    <button className="fc-meal-entry" type="button" onClick={onClick}>
      <MealPhotoThumbnail src={meal.photoPreview} className="fc-meal-entry-image" sizes="56px" />
      <span className="fc-meal-text"><strong>{meal.title}</strong><small>{time} · {amount}</small><small>{meal.method === "foto" ? tr(language, "Dari foto · ditinjau", "Photo · reviewed") : meal.method === "tersimpan" ? tr(language, "Makanan tersimpan", "Saved meal") : tr(language, "Dicatat manual", "Logged manually")}</small></span>
      <span className="fc-meal-calories">{number(total(meal.items).calories)}<small>{tr(language, "kkal", "kcal")}</small></span>
    </button>
  </Card>;
}
export default function HomeDashboard(props: Props) {
  const { language } = useLanguage();
  const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString(language);
  const weekRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = weekRef.current;
    const selected = Array.from(strip?.querySelectorAll<HTMLButtonElement>("button[data-date]") ?? []).find((button) => button.dataset.date === props.date);
    if (strip && selected) strip.scrollTo({ left: selected.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + selected.clientWidth / 2, behavior: "smooth" });
  }, [props.date]);
  const nutrition = props.meals.length ? total(props.meals.flatMap((meal) => meal.items)) : { calories: null, protein: null, carbs: null, fat: null };
  const percent = nutrition.calories === null ? 0 : Math.min(100, nutrition.calories / Math.max(1, props.target) * 100);
  const remaining = nutrition.calories === null ? null : props.target - nutrition.calories;
  const savedMacros = activeTarget(props.targets)?.macros;
  const week = mondayOf(props.date);
  const macros = [
    { label: "Protein", value: nutrition.protein, target: savedMacros?.protein ?? Math.round(props.profile.weight * 1.2), Icon: BicepsFlexed, tone: "protein" },
    { label: tr(language, "Karbohidrat", "Carbohydrates"), value: nutrition.carbs, target: savedMacros?.carbs ?? Math.round(props.target * .5 / 4), Icon: Wheat, tone: "carbs" },
    { label: tr(language, "Lemak", "Fat"), value: nutrition.fat, target: savedMacros?.fat ?? Math.round(props.target * .3 / 9), Icon: Droplet, tone: "fat" },
  ];
  return <div className="fc-home">
    <div className="fc-greeting"><div><h1>{tr(language, "Halo", "Hello")}{props.profile.name ? `, ${props.profile.name}` : ""}!</h1><p>{tr(language, "Makan enak, catat dengan tenang", "Enjoy your food, log with ease")} <Leaf size={14} /></p></div></div>
    <div className="fc-date-heading"><span>{localDate(props.date).toLocaleDateString(language, { month: "long", year: "numeric" })}</span><div><Button variant="ghost" size="icon" aria-label={tr(language, "Minggu sebelumnya", "Previous week")} onClick={() => props.onDate(addCalendarDays(props.date, -7))}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label={tr(language, "Minggu berikutnya", "Next week")} disabled={addCalendarDays(week, 7) > props.today} onClick={() => props.onDate(addCalendarDays(props.date, 7) > props.today ? props.today : addCalendarDays(props.date, 7))}><ChevronRight /></Button></div></div>
    <div className="fc-week" ref={weekRef} aria-label={tr(language, "Pilih tanggal", "Select date")}>{Array.from({ length: 14 }, (_, index) => { const date = addCalendarDays(week, index - 7); const entries = props.calendarMeals.filter((meal) => meal.date === date); const calories = entries.length ? total(entries.flatMap((meal) => meal.items)).calories : null; const dayTarget = targetOnDate(date, props.targets) ?? props.target; const progress = calories === null ? 0 : Math.min(100, Math.max(0, calories / Math.max(1, dayTarget) * 100)); const logged = entries.length > 0; return <button key={date} data-date={date} type="button" aria-pressed={date === props.date} aria-label={`${localDate(date).toLocaleDateString(language, { weekday: "long", day: "numeric", month: "long" })}: ${logged ? `${entries.length} ${tr(language, "catatan makan", "food logs")}, ${calories === null ? tr(language, "kalori belum lengkap", "calories incomplete") : `${Math.round(progress)}% ${tr(language, "dari target", "of goal")}`}` : tr(language, "belum ada makanan tercatat", "no food logged")}`} disabled={date > props.today} className={`${date === props.date ? "selected " : ""}${logged ? "is-logged" : "is-empty"}`} onClick={() => props.onDate(date)}><span>{localDate(date).toLocaleDateString(language, { weekday: "short" })}</span><span className="fc-day-ring" style={{ "--day-progress": `${progress}%` } as React.CSSProperties}><strong>{localDate(date).getDate()}</strong></span><i className={logged ? "has-entry" : date === props.today ? "is-today" : ""} /></button>; })}</div>
    <Card className="fc-calorie-summary"><div className="fc-calorie-ring" style={{ "--percent": `${percent}%` } as React.CSSProperties}><div><strong>{number(nutrition.calories)}</strong><span>{tr(language, "kkal", "kcal")}</span></div></div><div className="fc-calorie-copy"><h2>{props.date === props.today ? tr(language, "Kalori hari ini", "Today's calories") : tr(language, "Kalori tercatat", "Logged calories")}</h2><p>{tr(language, "dari", "of")} {number(props.target)} {tr(language, "kkal", "kcal")}</p><Progress value={percent} aria-label={tr(language, "Kalori terhadap target", "Calories toward goal")} /><small>{remaining === null ? tr(language, "Belum ada catatan", "No meals logged") : remaining >= 0 ? `${number(remaining)} ${tr(language, "kkal hingga target", "kcal remaining")}` : `${number(-remaining)} ${tr(language, "kkal di atas target", "kcal above goal")}`}</small></div></Card>
    <div className="fc-macros">{macros.map(({ label, value, target, Icon, tone }) => <Card className={`fc-macro fc-${tone}`} key={label}><span className="fc-macro-icon"><Icon size={17} /></span><h3>{label}</h3><strong>{number(value)} <small>g</small></strong><p>{tr(language, "dari", "of")} {number(target)} g</p><Progress value={value === null ? 0 : Math.min(100, value / Math.max(1, target) * 100)} aria-label={`${label} ${tr(language, "terhadap target", "toward goal")}`} /></Card>)}</div>
    {(props.scan || props.recentUploads.length > 0) && <section className="fc-recent-scan-section"><div className="fc-section-title"><h2>{tr(language, "Unggahan terbaru", "Recently uploaded")}</h2><Badge variant="secondary">{tr(language, "Foto", "Photo")}</Badge></div>{props.scan && <RecentScanCard {...props.scan} />}{props.recentUploads.map((meal) => <MealSummaryCard key={meal.id} title={meal.title} time={meal.eatenAt ? new Date(meal.eatenAt).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" }) : localDate(meal.date).toLocaleDateString(language, { dateStyle: "medium" })} items={meal.items} image={meal.photoPreview} onClick={() => props.onMeal(meal)} />)}</section>}
    <div className="fc-section-title"><h2>{props.date === props.today ? tr(language, "Makanan hari ini", "Today's food") : tr(language, "Makanan tercatat", "Logged food")}</h2><Button variant="ghost" onClick={props.onHistory}>{tr(language, "Lihat semua", "View all")} <ChevronRight size={15} /></Button></div>
    {!props.meals.length && <Card className="fc-empty"><UtensilsCrossed size={28} /><h3>{tr(language, "Belum ada catatan", "No meals logged")}</h3><p>{tr(language, "Mulai dari satu makanan. Hari tanpa catatan belum menggambarkan asupanmu.", "Start with one meal. An empty day does not describe your intake.")}</p><Button onClick={() => props.onAdd()}><Plus size={17} /> {tr(language, "Catat makanan", "Log food")}</Button></Card>}
    {mealTypes.map((type) => { const entries = props.meals.filter((meal) => meal.type === type); return <section className="fc-meal-group" key={type}><div><h3>{mealTypeLabel(language, type)}</h3><Button variant="ghost" size="icon" aria-label={`${tr(language, "Tambah", "Add")} ${mealTypeLabel(language, type).toLowerCase()}`} onClick={() => props.onAdd(type)}><Plus size={17} /></Button></div>{entries.map((meal) => <MealEntry meal={meal} key={meal.id} onClick={() => props.onMeal(meal)} />)}{!entries.length && <p>{tr(language, "Belum ada catatan", "No meals logged")}</p>}</section>; })}
    <Card className="fc-scan-prompt"><span><Camera size={24} /></span><div><h3>{tr(language, "Mulai dari sebuah foto", "Start with a photo")}</h3><p>{tr(language, "Kenali makanan, lalu tinjau estimasinya.", "Identify food, then review the estimate.")}</p></div><Button variant="ghost" size="icon" aria-label={tr(language, "Analisis foto makanan", "Analyze a food photo")} onClick={props.onPhoto}><ChevronRight /></Button></Card>
    <p className="fc-footnote">{tr(language, "Nilai gizi merupakan estimasi.", "Nutrition values are estimates.")} {props.account ? tr(language, "Catatan tersimpan di akunmu.", "Logs are saved to your account.") : tr(language, "Mode demo menyimpan catatan di perangkat ini.", "Demo mode saves logs on this device.")}</p>
  </div>;
}
