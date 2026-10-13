"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useState, type FormEvent } from "react";
import { Activity, ChevronLeft, ChevronRight, TrendingUp, X } from "lucide-react";
import type { Profile, WeightEntry } from "@/lib/food";
import { formatWeeklyDate, todayInTimeZone, weeklyRangeLabel, type Macro, type WeeklySummary } from "@/lib/weekly-progress";
import ProgressReportCards from "./ProgressReportCards";
import { tr, useLanguage } from "@/lib/language";

type Props = {
  summary: WeeklySummary;
  currentWeek: boolean;
  loading: boolean;
  error: boolean;
  allWeights: WeightEntry[];
  profile: Profile;
  accountId: string | null;
  onPrevious: () => void;
  onNext: () => void;
  onOpenDate: (date: string) => void;
  onRetry: () => void;
  onSaveWeight: (weight: number) => Promise<boolean>;
  onRemoveWeight: (id: string) => Promise<void>;
};

export default function WeeklyProgress({ summary, currentWeek, loading, error, allWeights, profile, accountId, onPrevious, onNext, onOpenDate, onRetry, onSaveWeight, onRemoveWeight }: Props) {
  const { language } = useLanguage();
  const whole = (value: number) => Math.round(value).toLocaleString(language);
  const decimal = (value: number) => value.toLocaleString(language, { maximumFractionDigits: 1 });
  const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => formatWeeklyDate(date, options, language);
  const rangeLabel = weeklyRangeLabel(summary.start, language);
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const maxScale = Math.max(1, ...summary.days.flatMap((day) => [day.calories ?? 0, day.target ?? 0]));
  const macros: { key: Macro; label: string }[] = [{ key: "protein", label: "Protein" }, { key: "carbs", label: tr(language, "Karbohidrat", "Carbohydrates") }, { key: "fat", label: tr(language, "Lemak", "Fat") }];
  async function submitWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value < 20 || value > 400) return;
    setSavingWeight(true);
    try { if (await onSaveWeight(value)) setWeightInput(""); }
    finally { setSavingWeight(false); }
  }

  return <>
    <div className="page-intro"><span className="eyebrow">{tr(language, "PROGRESMU", "YOUR PROGRESS")}</span><h1>{tr(language, "Laporan progres", "Progress report")}</h1><p>{tr(language, "Berat badan, kalori, dan catatan mingguanmu.", "Your weight, calories, and weekly logs.")}</p></div>
    <div className="weekly-nav" aria-label={tr(language, "Navigasi minggu", "Week navigation")}><Button variant="ghost" size="icon" className="icon-button" onClick={onPrevious} aria-label={tr(language, "Minggu sebelumnya", "Previous week")}><ChevronLeft size={20} /></Button><div aria-live="polite"><strong>{rangeLabel}</strong><span>{tr(language, "Senin–Minggu", "Monday–Sunday")} · Asia/Makassar</span></div><Button variant="ghost" size="icon" className="icon-button" onClick={onNext} aria-label={tr(language, "Minggu berikutnya", "Next week")} disabled={currentWeek}><ChevronRight size={20} /></Button></div>
    {loading && <div className="weekly-state" role="status">{tr(language, "Memuat catatan akun untuk ringkasan minggu ini…", "Loading account records for this week…")}</div>}
    {error && <div className="weekly-state" role="alert">{tr(language, "Catatan akun belum dapat dimuat.", "Account records could not be loaded.")} <button className="text-button" onClick={onRetry}>{tr(language, "Coba lagi", "Try again")}</button></div>}
    {!loading && !error && <>
      <ProgressReportCards key={accountId ?? "local"} profile={profile} weights={allWeights} summary={summary} accountId={accountId} />
      <Card className="panel weekly-overview" aria-labelledby="weekly-overview-title"><div className="card-top"><div><span className="card-kicker">{rangeLabel.toUpperCase()}</span><h2 id="weekly-overview-title">{tr(language, "Gambaran minggu ini", "This week at a glance")}</h2></div><span className="card-soft-icon"><Activity size={19} /></span></div>
        {summary.loggedDays ? <><div className="weekly-stats"><div><strong>{summary.loggedDays}<small>/7 {tr(language, "hari", "days")}</small></strong><span>{tr(language, "hari dengan makanan tercatat", "days with food logged")}</span></div><div><strong>{summary.mealCount}</strong><span>{tr(language, "catatan makan", "meal logs")}</span></div><div><strong>{summary.averageCalories === null ? "—" : whole(summary.averageCalories)}<small> {tr(language, "kkal", "kcal")}</small></strong><span>{tr(language, "rata-rata dari", "average over")} {summary.calorieDays} {tr(language, "hari dengan data kalori lengkap", "days with complete calorie data")}</span></div></div><p className="weekly-context">{summary.comparableDays ? `${summary.comparableDays} ${tr(language, "hari memiliki catatan kalori lengkap dan target aktif", "days have complete calorie logs and active goals")}. ${tr(language, "Di bawah", "Below")}: ${summary.comparisonCounts.below}, ${tr(language, "sesuai", "at goal")}: ${summary.comparisonCounts.at}, ${tr(language, "di atas", "above")}: ${summary.comparisonCounts.above}.` : tr(language, "Belum ada hari dengan catatan kalori lengkap dan target historis yang dapat dibandingkan.", "No days have both complete calorie logs and a historical goal to compare.")}</p>{summary.loggedDays < 3 && <p className="weekly-limited">{tr(language, "Data minggu ini masih terbatas", "This week’s data is limited")} ({summary.loggedDays} {tr(language, "hari tercatat", "logged days")}).</p>}</> : <div className="weekly-empty">{tr(language, "Belum ada makanan tercatat pada minggu ini. Hari tanpa catatan tidak dihitung sebagai nol kalori.", "No food was logged this week. Days without logs are not counted as zero calories.")}</div>}
      </Card>
      <Card className="panel weekly-trend" aria-labelledby="weekly-trend-title"><div className="card-top"><div><span className="card-kicker">{tr(language, "KALORI HARIAN", "DAILY CALORIES")}</span><h2 id="weekly-trend-title">{tr(language, "Tren kalori tercatat", "Logged calorie trend")}</h2></div><span className="card-soft-icon"><TrendingUp size={19} /></span></div><p className="weekly-context">{tr(language, "Ketuk atau pilih tanggal untuk melihat makanan pada hari itu. Angka target adalah target yang aktif pada akhir tanggal setempat.", "Select a date to see that day’s meals. The goal is the one active at the end of that local day.")}</p>
        <div className="weekly-chart" aria-label={`${tr(language, "Tren kalori", "Calorie trend")} ${rangeLabel}. ${summary.loggedDays} ${tr(language, "hari tercatat dari 7 hari", "logged days out of 7")}.`}>{summary.days.map((day) => {
          const future = day.date > todayInTimeZone();
          const missing = day.mealCount === 0;
          const partial = day.mealCount > 0 && day.calories === null;
          const description = `${dateLabel(day.date, { weekday: "long", day: "numeric", month: "long" })}: ${future ? tr(language, "belum berlangsung", "upcoming") : missing ? tr(language, "belum ada catatan", "no logs") : partial ? tr(language, "data kalori belum lengkap", "incomplete calorie data") : `${whole(day.calories ?? 0)} ${tr(language, "kkal tercatat", "kcal logged")}`}${day.target !== null ? `; ${tr(language, "target", "goal")} ${whole(day.target)} ${tr(language, "kkal", "kcal")}` : `; ${tr(language, "tanpa target historis", "no historical goal")}`}`;
          return <button key={day.date} type="button" className={`weekly-day${missing ? " is-missing" : ""}${partial ? " is-partial" : ""}`} onClick={() => onOpenDate(day.date)} disabled={future} aria-label={`${description}. ${tr(language, "Buka catatan hari ini.", "Open this day’s logs.")}`} title={description}>
            <span className="weekly-day-plot"><span className="weekly-day-rail">{day.target !== null && <span className="weekly-target-marker" style={{ bottom: `${day.target / maxScale * 100}%` }} aria-hidden="true" />}{day.calories !== null && <span className="weekly-day-bar" style={{ height: `${day.calories === 0 ? 2 : Math.max(day.calories / maxScale * 100, 4)}%` }} aria-hidden="true" />}</span></span><span className="weekly-day-name">{dateLabel(day.date, { weekday: "short" })}</span><span className="weekly-day-value">{missing ? "—" : partial ? "?" : whole(day.calories ?? 0)}</span><span className="weekly-day-target">{day.target === null ? "" : `T ${whole(day.target)}`}</span>
          </button>;
        })}</div><p className="microcopy">{tr(language, "Garis kecil pada tiap hari menunjukkan target historis. Garis putus-putus berarti belum ada catatan; tanda ? berarti nilai kalori belum lengkap. Angka adalah perkiraan dari catatan makanan.", "The small line on each day marks its historical goal. A dashed line means no log; ? means incomplete calorie data. Values are estimates from food logs.")}</p>
      </Card>
      <div className="progress-grid weekly-details"><Card className="panel" aria-labelledby="weekly-macro-title"><div className="card-top"><div><span className="card-kicker">{tr(language, "RATA-RATA HARIAN", "DAILY AVERAGE")}</span><h2 id="weekly-macro-title">{tr(language, "Makro tercatat", "Logged macros")}</h2></div></div><p className="weekly-context">{rangeLabel}. {tr(language, "Setiap rata-rata memakai hari yang seluruh itemnya memiliki nilai makro tersebut.", "Each average uses days where every item has that macro value.")}</p><div className="weekly-macros">{macros.map(({ key, label }) => <div key={key}><span>{label}</span><strong>{summary.macroAverages[key].value === null ? "—" : `${decimal(summary.macroAverages[key].value)} g`}</strong><small>{summary.macroAverages[key].days} {tr(language, "hari lengkap", "complete days")}</small></div>)}</div>{summary.incompleteNutrition && <p className="weekly-limited">{tr(language, "Sebagian informasi gizi belum lengkap; hari tersebut tidak masuk rata-rata untuk nilai yang hilang.", "Some nutrition values are incomplete; those days are excluded from averages for missing values.")}</p>}</Card>
        <Card className="panel" aria-labelledby="weekly-weight-title"><div className="card-top"><div><span className="card-kicker">{tr(language, "BERAT BADAN", "WEIGHT")}</span><h2 id="weekly-weight-title">{tr(language, "Catatan berat", "Weight entries")}</h2></div></div>{summary.weightEntries.length ? <div className="weekly-weight-values">{summary.weightEntries.map((entry) => <div key={entry.id}><time dateTime={entry.date}>{dateLabel(entry.date, { day: "numeric", month: "short" })}</time><strong>{decimal(entry.weight)} kg</strong></div>)}</div> : <p className="weekly-context">{tr(language, "Belum ada catatan berat minggu ini.", "No weight entries this week.")}</p>}{summary.weightChange ? <p className="weekly-context">{tr(language, "Catatan pertama", "First entry")} {decimal(summary.weightChange.first.weight)} kg ({dateLabel(summary.weightChange.first.date, { day: "numeric", month: "short" })}), {tr(language, "terakhir", "latest")} {decimal(summary.weightChange.latest.weight)} kg ({dateLabel(summary.weightChange.latest.date, { day: "numeric", month: "short" })}); {tr(language, "selisih", "change")} {summary.weightChange.difference > 0 ? "+" : ""}{decimal(summary.weightChange.difference)} kg.</p> : <p className="weekly-context">{tr(language, "Perbandingan membutuhkan dua catatan berat pada minggu ini.", "A comparison needs two weight entries this week.")}</p>}
          <form className="weight-form" onSubmit={submitWeight}><Field className="weekly-weight-field"><FieldLabel htmlFor="weekly-weight-input">{tr(language, "Catat berat hari ini jika kamu mau", "Log today’s weight if you like")}</FieldLabel><div><input id="weekly-weight-input" type="number" step="0.1" min="20" max="400" placeholder={tr(language, "Contoh: 65,5", "Example: 65.5")} value={weightInput} onChange={(event) => setWeightInput(event.target.value)} required /><button className="primary-button" type="submit" disabled={savingWeight}>{savingWeight ? tr(language, "Menyimpan…", "Saving…") : tr(language, "Simpan", "Save")}</button></div></Field></form>{allWeights.length > 0 && <details className="weekly-weight-history"><summary>{tr(language, "Semua catatan berat", "All weight entries")} ({allWeights.length})</summary><div className="weight-list">{[...allWeights].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <div key={entry.id}><span>{dateLabel(entry.date, { day: "numeric", month: "short", year: "numeric" })}</span><strong>{decimal(entry.weight)} kg</strong><Button variant="destructive" size="icon-xs" aria-label={`${tr(language, "Hapus berat", "Delete weight")} ${entry.date}`} onClick={() => void onRemoveWeight(entry.id)}><X size={15} /></Button></div>)}</div></details>}</Card></div>
      <Card className="panel weekly-insights" aria-labelledby="weekly-insights-title"><span className="card-kicker">{tr(language, "DARI CATATANMU", "FROM YOUR LOGS")}</span><h2 id="weekly-insights-title">{tr(language, "Yang terlihat minggu ini", "What this week shows")}</h2>{summary.insights.length ? <ul>{summary.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul> : <p className="weekly-context">{tr(language, "Belum cukup catatan untuk menampilkan pengamatan minggu ini.", "Not enough logs for observations this week.")}</p>}<p className="microcopy">{tr(language, "Ringkasan ini hanya menjelaskan catatan yang tersedia dan tidak menilai kesehatan atau hasilnya.", "This summary describes available logs and does not assess health or outcomes.")}</p></Card>
    </>}
  </>;
}
