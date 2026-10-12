"use client";
import { Camera, Check, Leaf, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return <main className="fc-welcome"><div className="fc-wordmark"><Leaf /> Forkcast</div><div className="fc-welcome-art" aria-hidden="true"><div className="fc-welcome-plate"><UtensilsCrossed size={65} strokeWidth={1.3} /></div><span className="fc-art-camera"><Camera size={25} /></span><span className="fc-art-check"><Check size={22} /> Ditinjau olehmu</span></div><div><span className="fc-kicker">JURNAL MAKANMU, SETIAP HARI</span><h1>Kenali makananmu.<br />Temukan ritmemu.</h1><p>Catat dari foto atau cari makanan. Tinjau porsinya, lalu lihat pola makanmu dari waktu ke waktu.</p></div><div className="fc-welcome-actions"><Button onClick={onStart}>Mulai</Button><Button variant="ghost" onClick={onLogin}>Sudah punya akun? Masuk</Button><small>Kamu bisa mencoba tanpa akun di perangkat ini.</small></div></main>;
}
