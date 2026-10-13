"use client";
import { Camera, Check, Leaf, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, useLanguage } from "@/lib/language";
export default function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const { language } = useLanguage();
  return <main className="fc-welcome"><div className="fc-wordmark"><Leaf /> Forkcast</div><div className="fc-welcome-art" aria-hidden="true"><div className="fc-welcome-plate"><UtensilsCrossed size={65} strokeWidth={1.3} /></div><span className="fc-art-camera"><Camera size={25} /></span><span className="fc-art-check"><Check size={22} /> {tr(language, "Ditinjau olehmu", "Reviewed by you")}</span></div><div><span className="fc-kicker">{tr(language, "JURNAL MAKANMU, SETIAP HARI", "YOUR DAILY FOOD JOURNAL")}</span><h1>{tr(language, "Kenali makananmu.", "Know your food.")}<br />{tr(language, "Temukan ritmemu.", "Find your rhythm.")}</h1><p>{tr(language, "Catat dari foto atau cari makanan. Tinjau porsinya, lalu lihat pola makanmu dari waktu ke waktu.", "Log food from a photo or search. Review portions and see your eating patterns over time.")}</p></div><div className="fc-welcome-actions"><Button onClick={onStart}>{tr(language, "Mulai", "Get started")}</Button><Button variant="ghost" onClick={onLogin}>{tr(language, "Sudah punya akun? Masuk", "Already have an account? Sign in")}</Button><small>{tr(language, "Kamu bisa mencoba tanpa akun di perangkat ini.", "You can try it on this device without an account.")}</small></div></main>;
}
