"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Camera, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Profile, WeightEntry } from "@/lib/food";
import { addCalendarDays, formatWeeklyDate, todayInTimeZone, type WeeklySummary } from "@/lib/weekly-progress";

type ProgressPhoto = { id: string; date: string; src: string };
type Period = "90D" | "6M" | "1Y" | "ALL";
export const progressPhotoStorageKey = (accountId: string | null) => `forkcast-progress-photos-v1-${accountId ?? "local"}`;
const decimal = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
const whole = (value: number) => Math.round(value).toLocaleString("id-ID");

function startOfPeriod(period: Period, today: string) {
  if (period === "ALL") return null;
  if (period === "90D") return addCalendarDays(today, -89);
  const date = new Date(`${today}T12:00:00Z`);
  if (period === "6M") date.setUTCMonth(date.getUTCMonth() - 6);
  else date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

export default function ProgressReportCards({ profile, weights, summary, accountId }: { profile: Profile; weights: WeightEntry[]; summary: WeeklySummary; accountId: string | null }) {
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) { setPhotoError("Pilih foto JPEG, PNG, atau WebP di bawah 8 MB."); return; }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Foto tidak dapat diproses.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const next = [{ id: crypto.randomUUID(), date: today, src: canvas.toDataURL("image/jpeg", .72) }, ...photos].slice(0, 6);
      localStorage.setItem(photoStorage, JSON.stringify(next));
      setPhotos(next);
      setPhotoError("");
    } catch { setPhotoError("Foto tidak dapat disimpan di perangkat ini."); }
  }

  function removePhoto(id: string) {
    const next = photos.filter((photo) => photo.id !== id);
    try { localStorage.setItem(photoStorage, JSON.stringify(next)); setPhotos(next); setPhotoError(""); }
    catch { setPhotoError("Perubahan foto belum dapat disimpan."); }
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
    <Card className="fc-report-card fc-current-weight"><div className="fc-report-heading"><span>Berat saat ini</span><small>{latest ? formatWeeklyDate(latest.date, { day: "numeric", month: "short", year: "numeric" }) : "Dari profil"}</small></div><strong>{decimal(currentWeight)} <small>kg</small></strong><div className="fc-report-divider" /><div className="fc-weight-meta"><span>Awal <b>{first ? `${decimal(first.weight)} kg` : "—"}</b></span><span>Perubahan <b>{first && latest && first.id !== latest.id ? `${latest.weight - first.weight > 0 ? "+" : ""}${decimal(latest.weight - first.weight)} kg` : "—"}</b></span></div></Card>

    <Card className="fc-report-card fc-bmi-card"><div className="fc-report-heading"><h2>BMI</h2><span>Indeks massa tubuh</span></div><strong>{bmi === null ? "—" : decimal(bmi)}</strong><p>Dihitung dari {decimal(currentWeight)} kg dan tinggi {decimal(profile.height)} cm yang tercatat di profil.</p></Card>

    <Card className="fc-report-card fc-weight-chart-card"><div className="fc-report-heading"><h2>Progres berat</h2><small>{chartWeights.length} catatan</small></div>{points.length ? <div className="fc-weight-chart"><svg viewBox="0 0 340 180" role="img" aria-label={`Grafik berat badan, ${chartWeights.length} catatan pada rentang ${period}`} preserveAspectRatio="none"><line x1="42" y1="37" x2="320" y2="37" /><line x1="42" y1="91" x2="320" y2="91" /><line x1="42" y1="145" x2="320" y2="145" /><text x="5" y="41">{decimal(high)}</text><text x="5" y="95">{decimal((high + low) / 2)}</text><text x="5" y="149">{decimal(low)}</text>{points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />}{points.map((point) => <circle key={point.entry.id} cx={point.x} cy={point.y} r="4" />)}</svg><div className="fc-weight-chart-dates"><span>{formatWeeklyDate(chartWeights[0].date, { day: "numeric", month: "short" })}</span><span>{formatWeeklyDate(chartWeights.at(-1)!.date, { day: "numeric", month: "short" })}</span></div></div> : <p className="fc-report-empty">Belum ada catatan berat untuk rentang ini.</p>}<div className="fc-report-periods" aria-label="Rentang grafik berat">{(["90D", "6M", "1Y", "ALL"] as Period[]).map((option) => <button type="button" key={option} aria-pressed={period === option} onClick={() => setPeriod(option)}>{option === "ALL" ? "SEMUA" : option}</button>)}</div></Card>

    <Card className="fc-report-card"><h2>Perubahan berat</h2><div className="fc-weight-changes">{([{ days: 3, label: "3 hari" }, { days: 7, label: "7 hari" }, { days: 14, label: "14 hari" }, { days: 30, label: "30 hari" }, { days: 90, label: "90 hari" }, { days: null, label: "Semua" }] as const).map(({ days, label }) => { const change = changeFor(days); return <div key={label}><span>{label}</span><strong>{change === null ? "—" : `${change > 0 ? "+" : ""}${decimal(change)} kg`}</strong><small>{change === null ? <><ArrowRight size={15} /> Belum cukup data</> : change > 0 ? <><ArrowUpRight size={15} /> Naik</> : change < 0 ? <><ArrowDownRight size={15} /> Turun</> : <><ArrowRight size={15} /> Tetap</>}</small></div>; })}</div></Card>

    <Card className="fc-report-card fc-progress-photos"><h2>Foto progres</h2>{photos.length ? <div className="fc-progress-photo-grid">{photos.map((photo) => <div key={photo.id}><Image src={photo.src} alt={`Foto progres ${photo.date}`} fill sizes="110px" unoptimized /><button type="button" aria-label={`Hapus foto progres ${photo.date}`} onClick={() => removePhoto(photo.id)}><X size={15} /></button></div>)}</div> : <div className="fc-photo-empty"><Camera size={35} /><p>Tambahkan foto untuk melihat perubahan dari waktu ke waktu.</p></div>}<button className="fc-photo-upload" type="button" onClick={() => inputRef.current?.click()}><Plus size={18} /> Tambah foto</button><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void addPhoto(file); }} /><small>Foto disimpan hanya di perangkat ini.</small>{photoError && <p role="alert" className="fc-photo-error">{photoError}</p>}</Card>

    <Card className="fc-report-card fc-average-calories"><h2>Rata-rata kalori harian</h2><div className="fc-average-value"><strong>{summary.averageCalories === null ? "—" : whole(summary.averageCalories)}</strong><span>kkal · {summary.calorieDays} hari dengan data lengkap</span></div><div className="fc-average-chart" role="img" aria-label={`Grafik kalori harian ${summary.days.map((day) => `${day.date}: ${day.calories === null ? "tidak lengkap" : `${whole(day.calories)} kkal`}`).join(", ")}`}>{summary.days.map((day) => <div key={day.date}><span className="fc-average-bar-track"><span style={{ height: `${day.calories === null ? 0 : Math.max(4, day.calories / maxCalories * 100)}%` }} /></span><small>{formatWeeklyDate(day.date, { weekday: "short" })}</small></div>)}</div><p>Rata-rata dihitung dari hari yang kalori makanannya lengkap.</p></Card>
  </div>;
}
