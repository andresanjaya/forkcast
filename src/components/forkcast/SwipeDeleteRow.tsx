"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

export default function SwipeDeleteRow({ children, className = "", label, onDelete }: {
  children: ReactNode;
  className?: string;
  label: string;
  onDelete: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (Math.abs(dx) > Math.abs(dy) && dx < 0) setOffset(Math.max(-88, (revealed ? -88 : 0) + dx));
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      const next = dx < -42 || revealed && dx < 24;
      setRevealed(next);
      setOffset(next ? -88 : 0);
    } else setOffset(revealed ? -88 : 0);
    start.current = null;
  }

  return <div className={`fc-swipe-delete ${className}`}>
    <button className="fc-swipe-delete-action" type="button" aria-label={label} tabIndex={revealed ? 0 : -1} onClick={onDelete}><Trash2 size={19} /><span>Hapus</span></button>
    <div className="fc-swipe-delete-content" style={{ transform: `translateX(${offset}px)` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {children}
    </div>
  </div>;
}
