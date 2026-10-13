"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Camera, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type { Profile, WeightEntry } from "@/lib/food";
import { addCalendarDays, formatWeeklyDate, todayInTimeZone, type WeeklySummary } from "@/lib/weekly-progress";
import { tr, useLanguage } from "@/lib/language";

type ProgressPhoto = { id: string; date: string; src: string };
type Period = "90D" | "6M" | "1Y" | "ALL";
export const progressPhotoStorageKey = (accountId: string | null) => `forkcast-progress-photos-v1-${accountId ?? "local"}`;

function startOfPeriod(period: Period, today: string) {
  if (period === "ALL") return null;
  if (period === "90D") return addCalendarDays(today, -89);
  const date = new Date(`${today}T12:00:00Z`);
  if (period === "6M") date.setUTCMonth(date.getUTCMonth() - 6);
  else date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

export default function ProgressReportCards({ profile, weights, summary, accountId }: { profile: Profile; weights: WeightEntry[]; summary: WeeklySummary; accountId: string | null }) {
  const { language } = useLanguage();
  const decimal = (value: number) => value.toLocaleString(language, { maximumFractionDigits: 1 });
  const whole = (value: number) => Math.round(value).toLocaleString(language);
  const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => formatWeeklyDate(date, options, language);
  const [period, setPeriod] = useState<Period>("90D");
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const photoStorage = progressPhotoStorageKey(accountId);
  const sorted = useMemo(() => weights.filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0).sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const latest = sorted.at(-1);
  const first = sorted[0];
  const currentWeight = latest?.weight ?? profile.weight;
  const bmi = profile.height > 0 && currentWeight > 0 ? currentWeight / (profile.height / 100) ** 2 : null;
  const today = todayInTimeZone();
  const cutoff = startOfPeriod(period, today);
  const chartWeights = cutoff ? sorted.filter((entry) => entry.date >= cutoff) : sorted;
  const values = chartWeights.map((entry) => entry.weight);
  const low = values.length ? Math.floor(Math.min(...values) - 1) : 0;
  const high = values.length ? Math.ceil(Math.max(...values) + 1) : 1;
  const span = Math.max(1, high - low);
  const firstChartDate = chartWeights.length ? Date.parse(`${chartWeights[0].date}T12:00:00Z`) : 0;
  const lastChartDate = chartWeights.length ? Date.parse(`${chartWeights.at(-1)!.date}T12:00:00Z`) : 0;
  const points = chartWeights.map((entry) => ({
    x: firstChartDate === lastChartDate ? 185 : 42 + (Date.parse(`${entry.date}T12:00:00Z`) - firstChartDate) / (lastChartDate - firstChartDate) * 278,
    y: 145 - (entry.weight - low) / span * 108,
    entry,
  }));
  const maxCalories = Math.max(1000, ...summary.days.map((day) => day.calories ?? 0));

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(photoStorage) ?? "[]") as unknown;
      setPhotos(Array.isArray(stored) ? stored.filter((entry): entry is ProgressPhoto => Boolean(entry && typeof entry === "object" && "src" in entry && typeof entry.src === "string" && entry.src.startsWith("data:image/"))).slice(0, 6) : []);
    } catch { setPhotos([]); }
  }, [photoStorage]);

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) { setPhotoError(tr(language, "Pilih foto JPEG, PNG, atau WebP di bawah 8 MB.", "Choose a JPEG, PNG, or WebP photo under 8 MB.")); return; }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error(tr(language, "Foto tidak dapat diproses.", "Photo could not be processed."));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const next = [{ id: crypto.randomUUID(), date: today, src: canvas.toDataURL("image/jpeg", .72) }, ...photos].slice(0, 6);
      localStorage.setItem(photoStorage, JSON.stringify(next));
      setPhotos(next);
      setPhotoError("");
    } catch { setPhotoError(tr(language, "Foto tidak dapat disimpan di perangkat ini.", "Photo could not be saved on this device.")); }
  }

  function removePhoto(id: string) {
    const next = photos.filter((photo) => photo.id !== id);
    try { localStorage.setItem(photoStorage, JSON.stringify(next)); setPhotos(next); setPhotoError(""); }
    catch { setPhotoError(tr(language, "Perubahan foto belum dapat disimpan.", "Photo change could not be saved.")); }
  }

  function changeFor(days: number | null) {
    if (sorted.length < 2 || !latest) return null;
    if (days === null) return latest.weight - first.weight;
    const limit = addCalendarDays(today, -days);
    if (latest.date < limit) return null;
    const baseline = sorted.filter((entry) => entry.date <= limit).at(-1) ?? sorted.find((entry) => entry.date >= limit && entry.id !== latest.id);
    return baseline ? latest.weight - baseline.weight : null;
  }

  return <div className="fc-report-cards">
    <Card className="fc-report-card fc-current-weight"><div className="fc-report-heading"><span>{tr(language, "Berat saat ini", "Current weight")}</span><small>{latest ? dateLabel(latest.date, { day: "numeric", month: "short", year: "numeric" }) : tr(language, "Dari profil", "From profile")}</small></div><strong>{decimal(currentWeight)} <small>kg</small></strong><div className="fc-report-divider" /><div className="fc-weight-meta"><span>{tr(language, "Awal", "Start")} <b>{first ? `${decimal(first.weight)} kg` : "—"}</b></span><span>{tr(language, "Perubahan", "Change")} <b>{first && latest && first.id !== latest.id ? `${latest.weight - first.weight > 0 ? "+" : ""}${decimal(latest.weight - first.weight)} kg` : "—"}</b></span></div></Card>

    <Card className="fc-report-card fc-bmi-card"><div className="fc-report-heading"><h2>BMI</h2><span>{tr(language, "Indeks massa tubuh", "Body mass index")}</span></div><strong>{bmi === null ? "—" : decimal(bmi)}</strong><p>{tr(language, "Dihitung dari", "Calculated from")} {decimal(currentWeight)} kg {tr(language, "dan tinggi", "and height")} {decimal(profile.height)} cm {tr(language, "yang tercatat di profil.", "recorded in your profile.")}</p></Card>

    <Card className="fc-report-card fc-weight-chart-card"><div className="fc-report-heading"><h2>{tr(language, "Progres berat", "Weight progress")}</h2><small>{chartWeights.length} {tr(language, "catatan", "entries")}</small></div>{points.length ? <div className="fc-weight-chart"><svg viewBox="0 0 340 180" role="img" aria-label={`${tr(language, "Grafik berat badan", "Weight chart")}, ${chartWeights.length} ${tr(language, "catatan pada rentang", "entries in period")} ${period}`} preserveAspectRatio="none"><line x1="42" y1="37" x2="320" y2="37" /><line x1="42" y1="91" x2="320" y2="91" /><line x1="42" y1="145" x2="320" y2="145" /><text x="5" y="41">{decimal(high)}</text><text x="5" y="95">{decimal((high + low) / 2)}</text><text x="5" y="149">{decimal(low)}</text>{points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />}{points.map((point) => <circle key={point.entry.id} cx={point.x} cy={point.y} r="4" />)}</svg><div className="fc-weight-chart-dates"><span>{dateLabel(chartWeights[0].date, { day: "numeric", month: "short" })}</span><span>{dateLabel(chartWeights.at(-1)!.date, { day: "numeric", month: "short" })}</span></div></div> : <p className="fc-report-empty">{tr(language, "Belum ada catatan berat untuk rentang ini.", "No weight entries in this period.")}</p>}<div className="fc-report-periods" aria-label={tr(language, "Rentang grafik berat", "Weight chart range")}>{(["90D", "6M", "1Y", "ALL"] as Period[]).map((option) => <button type="button" key={option} aria-pressed={period === option} onClick={() => setPeriod(option)}>{option === "ALL" ? tr(language, "SEMUA", "ALL") : option}</button>)}</div></Card>

    <Card className="fc-report-card"><h2>{tr(language, "Perubahan berat", "Weight changes")}</h2><div className="fc-weight-changes">{([{ days: 3, label: "3 hari" }, { days: 7, label: "7 hari" }, { days: 14, label: "14 hari" }, { days: 30, label: "30 hari" }, { days: 90, label: "90 hari" }, { days: null, label: "Semua" }] as const).map(({ days, label }) => { const change = changeFor(days); return <div key={label}><span>{days === null ? tr(language, "Semua", "All time") : `${days} ${tr(language, "hari", "days")}`}</span><strong>{change === null ? "—" : `${change > 0 ? "+" : ""}${decimal(change)} kg`}</strong><small>{change === null ? <><ArrowRight size={15} /> {tr(language, "Belum cukup data", "Not enough data")}</> : change > 0 ? <><ArrowUpRight size={15} /> {tr(language, "Naik", "Up")}</> : change < 0 ? <><ArrowDownRight size={15} /> {tr(language, "Turun", "Down")}</> : <><ArrowRight size={15} /> {tr(language, "Tetap", "No change")}</>}</small></div>; })}</div></Card>

    <Card className="fc-report-card fc-progress-photos"><h2>{tr(language, "Foto progres", "Progress photos")}</h2>{photos.length ? <div className="fc-progress-photo-grid">{photos.map((photo) => <div key={photo.id}><Image src={photo.src} alt={`${tr(language, "Foto progres", "Progress photo")} ${photo.date}`} fill sizes="110px" unoptimized /><Button variant="destructive" size="icon-xs" type="button" aria-label={`${tr(language, "Hapus foto progres", "Delete progress photo")} ${photo.date}`} onClick={() => removePhoto(photo.id)}><X size={15} /></Button></div>)}</div> : <div className="fc-photo-empty"><Camera size={35} /><p>{tr(language, "Tambahkan foto untuk melihat perubahan dari waktu ke waktu.", "Add photos to see changes over time.")}</p></div>}<button className="fc-photo-upload" type="button" onClick={() => inputRef.current?.click()}><Plus size={18} /> {tr(language, "Tambah foto", "Add photo")}</button><Field className="sr-only"><FieldLabel htmlFor="progress-photo-file">{tr(language, "Pilih foto progres", "Choose progress photo")}</FieldLabel><input id="progress-photo-file" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void addPhoto(file); }} /></Field><small>{tr(language, "Foto disimpan hanya di perangkat ini.", "Photos are saved only on this device.")}</small>{photoError && <p role="alert" className="fc-photo-error">{photoError}</p>}</Card>

    <Card className="fc-report-card fc-average-calories"><h2>{tr(language, "Rata-rata kalori harian", "Daily average calories")}</h2><div className="fc-average-value"><strong>{summary.averageCalories === null ? "—" : whole(summary.averageCalories)}</strong><span>{tr(language, "kkal", "kcal")} · {summary.calorieDays} {tr(language, "hari dengan data lengkap", "days with complete data")}</span></div><div className="fc-average-chart" role="img" aria-label={`${tr(language, "Grafik kalori harian", "Daily calorie chart")} ${summary.days.map((day) => `${day.date}: ${day.calories === null ? tr(language, "tidak lengkap", "incomplete") : `${whole(day.calories)} ${tr(language, "kkal", "kcal")}`}`).join(", ")}`}>{summary.days.map((day) => <div key={day.date}><span className="fc-average-bar-track"><span style={{ height: `${day.calories === null ? 0 : Math.max(4, day.calories / maxCalories * 100)}%` }} /></span><small>{dateLabel(day.date, { weekday: "short" })}</small></div>)}</div><p>{tr(language, "Rata-rata dihitung dari hari yang kalori makanannya lengkap.", "The average uses days with complete food calorie data.")}</p></Card>
  </div>;
}
