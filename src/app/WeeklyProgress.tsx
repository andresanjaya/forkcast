"use client";

import { useState, type FormEvent } from "react";
import { Activity, ChevronLeft, ChevronRight, TrendingUp, X } from "lucide-react";
import type { WeightEntry } from "@/lib/food";
import { formatWeeklyDate, todayInTimeZone, weeklyRangeLabel, type Macro, type WeeklySummary } from "@/lib/weekly-progress";

type Props = {
  summary: WeeklySummary;
  currentWeek: boolean;
  loading: boolean;
  error: boolean;
  allWeights: WeightEntry[];
  onPrevious: () => void;
  onNext: () => void;
  onOpenDate: (date: string) => void;
  onRetry: () => void;
  onSaveWeight: (weight: number) => Promise<boolean>;
  onRemoveWeight: (id: string) => Promise<void>;
};

const whole = (value: number) => Math.round(value).toLocaleString("id-ID");
const decimal = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 1 });

export default function WeeklyProgress({ summary, currentWeek, loading, error, allWeights, onPrevious, onNext, onOpenDate, onRetry, onSaveWeight, onRemoveWeight }: Props) {
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const maxScale = Math.max(1, ...summary.days.flatMap((day) => [day.calories ?? 0, day.target ?? 0]));
  const macros: { key: Macro; label: string }[] = [{ key: "protein", label: "Protein" }, { key: "carbs", label: "Karbohidrat" }, { key: "fat", label: "Lemak" }];
  async function submitWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value < 20 || value > 400) return;
    setSavingWeight(true);
    try { if (await onSaveWeight(value)) setWeightInput(""); }
    finally { setSavingWeight(false); }
  }

  return <>
    <div className="page-intro"><span className="eyebrow">PROGRESMU</span><h1>Ringkasan mingguan</h1><p>Ringkasan dari catatan yang tersedia, untuk dilihat kembali tanpa penilaian.</p></div>
    <div className="weekly-nav" aria-label="Navigasi minggu"><button className="icon-button" onClick={onPrevious} aria-label="Minggu sebelumnya"><ChevronLeft size={20} /></button><div aria-live="polite"><strong>{weeklyRangeLabel(summary.start)}</strong><span>Senin–Minggu · Asia/Makassar</span></div><button className="icon-button" onClick={onNext} aria-label="Minggu berikutnya" disabled={currentWeek}><ChevronRight size={20} /></button></div>
    {loading && <div className="weekly-state" role="status">Memuat catatan akun untuk ringkasan minggu ini…</div>}
    {error && <div className="weekly-state" role="alert">Catatan akun belum dapat dimuat. <button className="text-button" onClick={onRetry}>Coba lagi</button></div>}
    {!loading && !error && <>
      <section className="panel weekly-overview" aria-labelledby="weekly-overview-title"><div className="card-top"><div><span className="card-kicker">{weeklyRangeLabel(summary.start).toUpperCase()}</span><h2 id="weekly-overview-title">Gambaran minggu ini</h2></div><span className="card-soft-icon"><Activity size={19} /></span></div>
        {summary.loggedDays ? <><div className="weekly-stats"><div><strong>{summary.loggedDays}<small>/7 hari</small></strong><span>hari dengan makanan tercatat</span></div><div><strong>{summary.mealCount}</strong><span>catatan makan</span></div><div><strong>{summary.averageCalories === null ? "—" : whole(summary.averageCalories)}<small> kkal</small></strong><span>rata-rata dari {summary.calorieDays} hari dengan data kalori lengkap</span></div></div><p className="weekly-context">{summary.comparableDays ? `${summary.comparableDays} hari memiliki catatan kalori lengkap dan target aktif. Di bawah: ${summary.comparisonCounts.below}, sesuai: ${summary.comparisonCounts.at}, di atas: ${summary.comparisonCounts.above}.` : "Belum ada hari dengan catatan kalori lengkap dan target historis yang dapat dibandingkan."}</p>{summary.loggedDays < 3 && <p className="weekly-limited">Data minggu ini masih terbatas ({summary.loggedDays} hari tercatat).</p>}</> : <div className="weekly-empty">Belum ada makanan tercatat pada minggu ini. Hari tanpa catatan tidak dihitung sebagai nol kalori.</div>}
      </section>
      <section className="panel weekly-trend" aria-labelledby="weekly-trend-title"><div className="card-top"><div><span className="card-kicker">KALORI HARIAN</span><h2 id="weekly-trend-title">Tren kalori tercatat</h2></div><span className="card-soft-icon"><TrendingUp size={19} /></span></div><p className="weekly-context">Ketuk atau pilih tanggal untuk melihat makanan pada hari itu. Angka target adalah target yang aktif pada akhir tanggal setempat.</p>
        <div className="weekly-chart" aria-label={`Tren kalori ${weeklyRangeLabel(summary.start)}. ${summary.loggedDays} hari tercatat dari 7 hari.`}>{summary.days.map((day) => {
          const future = day.date > todayInTimeZone();
          const missing = day.mealCount === 0;
          const partial = day.mealCount > 0 && day.calories === null;
          const description = `${formatWeeklyDate(day.date, { weekday: "long", day: "numeric", month: "long" })}: ${future ? "belum berlangsung" : missing ? "belum ada catatan" : partial ? "data kalori belum lengkap" : `${whole(day.calories ?? 0)} kkal tercatat`}${day.target !== null ? `; target ${whole(day.target)} kkal` : "; tanpa target historis"}`;
          return <button key={day.date} type="button" className={`weekly-day${missing ? " is-missing" : ""}${partial ? " is-partial" : ""}`} onClick={() => onOpenDate(day.date)} disabled={future} aria-label={`${description}. Buka catatan hari ini.`} title={description}>
            <span className="weekly-day-plot"><span className="weekly-day-rail">{day.target !== null && <span className="weekly-target-marker" style={{ bottom: `${day.target / maxScale * 100}%` }} aria-hidden="true" />}{day.calories !== null && <span className="weekly-day-bar" style={{ height: `${day.calories === 0 ? 2 : Math.max(day.calories / maxScale * 100, 4)}%` }} aria-hidden="true" />}</span></span><span className="weekly-day-name">{formatWeeklyDate(day.date, { weekday: "short" })}</span><span className="weekly-day-value">{missing ? "—" : partial ? "?" : whole(day.calories ?? 0)}</span><span className="weekly-day-target">{day.target === null ? "" : `T ${whole(day.target)}`}</span>
          </button>;
        })}</div><p className="microcopy">Garis kecil pada tiap hari menunjukkan target historis. Garis putus-putus berarti belum ada catatan; tanda ? berarti nilai kalori belum lengkap. Angka adalah perkiraan dari catatan makanan.</p>
      </section>
      <div className="progress-grid weekly-details"><section className="panel" aria-labelledby="weekly-macro-title"><div className="card-top"><div><span className="card-kicker">RATA-RATA HARIAN</span><h2 id="weekly-macro-title">Makro tercatat</h2></div></div><p className="weekly-context">{weeklyRangeLabel(summary.start)}. Setiap rata-rata memakai hari yang seluruh itemnya memiliki nilai makro tersebut.</p><div className="weekly-macros">{macros.map(({ key, label }) => <div key={key}><span>{label}</span><strong>{summary.macroAverages[key].value === null ? "—" : `${decimal(summary.macroAverages[key].value)} g`}</strong><small>{summary.macroAverages[key].days} hari lengkap</small></div>)}</div>{summary.incompleteNutrition && <p className="weekly-limited">Sebagian informasi gizi belum lengkap; hari tersebut tidak masuk rata-rata untuk nilai yang hilang.</p>}</section>
        <section className="panel" aria-labelledby="weekly-weight-title"><div className="card-top"><div><span className="card-kicker">BERAT BADAN</span><h2 id="weekly-weight-title">Catatan berat</h2></div></div>{summary.weightEntries.length ? <div className="weekly-weight-values">{summary.weightEntries.map((entry) => <div key={entry.id}><time dateTime={entry.date}>{formatWeeklyDate(entry.date, { day: "numeric", month: "short" })}</time><strong>{decimal(entry.weight)} kg</strong></div>)}</div> : <p className="weekly-context">Belum ada catatan berat minggu ini.</p>}{summary.weightChange ? <p className="weekly-context">Catatan pertama {decimal(summary.weightChange.first.weight)} kg ({formatWeeklyDate(summary.weightChange.first.date, { day: "numeric", month: "short" })}), terakhir {decimal(summary.weightChange.latest.weight)} kg ({formatWeeklyDate(summary.weightChange.latest.date, { day: "numeric", month: "short" })}); selisih {summary.weightChange.difference > 0 ? "+" : ""}{decimal(summary.weightChange.difference)} kg.</p> : <p className="weekly-context">Perbandingan membutuhkan dua catatan berat pada minggu ini.</p>}
          <form className="weight-form" onSubmit={submitWeight}><label htmlFor="weekly-weight-input">Catat berat hari ini jika kamu mau</label><div><input id="weekly-weight-input" type="number" step="0.1" min="20" max="400" placeholder="Contoh: 65,5" value={weightInput} onChange={(event) => setWeightInput(event.target.value)} required /><button className="primary-button" type="submit" disabled={savingWeight}>{savingWeight ? "Menyimpan…" : "Simpan"}</button></div></form>{allWeights.length > 0 && <details className="weekly-weight-history"><summary>Semua catatan berat ({allWeights.length})</summary><div className="weight-list">{[...allWeights].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <div key={entry.id}><span>{formatWeeklyDate(entry.date, { day: "numeric", month: "short", year: "numeric" })}</span><strong>{decimal(entry.weight)} kg</strong><button aria-label={`Hapus berat ${entry.date}`} onClick={() => void onRemoveWeight(entry.id)}><X size={15} /></button></div>)}</div></details>}</section></div>
      <section className="panel weekly-insights" aria-labelledby="weekly-insights-title"><span className="card-kicker">DARI CATATANMU</span><h2 id="weekly-insights-title">Yang terlihat minggu ini</h2>{summary.insights.length ? <ul>{summary.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul> : <p className="weekly-context">Belum cukup catatan untuk menampilkan pengamatan minggu ini.</p>}<p className="microcopy">Ringkasan ini hanya menjelaskan catatan yang tersedia dan tidak menilai kesehatan atau hasilnya.</p></section>
    </>}
  </>;
}
