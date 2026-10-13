"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import packageJson from "../../package.json";
import { tr, useLanguage } from "@/lib/language";

type UpdateStatus = "idle" | "checking" | "latest" | "available" | "applying" | "offline" | "error" | "unsupported";
const LAST_CHECK = "forkcast-last-update-check";

export default function PwaUpdates({ compact = false, onOpen, hasUnsavedChanges = false, onConfirmedReload }: { compact?: boolean; onOpen?: () => void; hasUnsavedChanges?: boolean; onConfirmedReload?: () => void }) {
  const { language } = useLanguage();
  const [version, setVersion] = useState(packageJson.version);
  const [lastCheck, setLastCheck] = useState("");
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRequested = useRef(false);
  const confirmedReload = useRef(onConfirmedReload);
  confirmedReload.current = onConfirmedReload;

  useEffect(() => {
    try { setLastCheck(localStorage.getItem(LAST_CHECK) ?? ""); } catch { /* Storage can be unavailable in private browsing. */ }
    if (!("serviceWorker" in navigator)) { setStatus("unsupported"); return; }
    if (!navigator.onLine) setStatus("offline");

    let mounted = true;
    let currentRegistration: ServiceWorkerRegistration | null = null;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const observedWorkers = new Set<ServiceWorker>();

    function readVersion(worker: ServiceWorker | null) {
      if (!worker) return;
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => { channel.port1.close(); channel.port2.close(); }, 1500);
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        window.clearTimeout(timeout);
        if (mounted && typeof event.data === "string") setVersion(event.data);
        channel.port1.close(); channel.port2.close();
      };
      worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
    }

    function observe(worker: ServiceWorker | null) {
      if (!worker || observedWorkers.has(worker)) return;
      observedWorkers.add(worker);
      worker.addEventListener("statechange", () => {
        if (!mounted) return;
        if (worker.state === "installed" && navigator.serviceWorker.controller) setStatus("available");
        if (worker.state === "redundant" && !currentRegistration?.waiting) setStatus("error");
      });
    }

    const onUpdateFound = () => {
      if (!currentRegistration) return;
      observe(currentRegistration.installing);
      if (navigator.serviceWorker.controller) setStatus("checking");
    };
    const onControllerChange = () => {
      if (reloadRequested.current) { reloadRequested.current = false; confirmedReload.current?.(); window.location.reload(); return; }
      if (hadController) setStatus("available");
      else { hadController = true; readVersion(navigator.serviceWorker.controller); }
    };
    const onOffline = () => setStatus("offline");
    const onOnline = () => setStatus((current) => current === "offline" ? "idle" : current);

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((found) => {
      if (!mounted) return;
      currentRegistration = found;
      registration.current = found;
      found.addEventListener("updatefound", onUpdateFound);
      observe(found.installing);
      if (found.waiting && navigator.serviceWorker.controller) setStatus("available");
      readVersion(navigator.serviceWorker.controller ?? found.active);
    }).catch(() => { if (mounted) setStatus(navigator.onLine ? "error" : "offline"); });

    return () => {
      mounted = false;
      currentRegistration?.removeEventListener("updatefound", onUpdateFound);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  async function checkUpdates() {
    if (!navigator.onLine) { setStatus("offline"); return; }
    if (!("serviceWorker" in navigator)) { setStatus("unsupported"); return; }
    setStatus("checking");
    try {
      const found = registration.current ?? await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      registration.current = found;
      await found.update();
      const checkedAt = new Date().toISOString();
      setLastCheck(checkedAt);
      try { localStorage.setItem(LAST_CHECK, checkedAt); } catch { /* Keep the result for this session. */ }
      if (found.waiting && navigator.serviceWorker.controller) setStatus("available");
      else if (!found.installing) setStatus("latest");
    } catch { setStatus(navigator.onLine ? "error" : "offline"); }
  }

  function applyUpdate() {
    if (hasUnsavedChanges && !window.confirm(tr(language, "Ada perubahan profil atau target yang belum disimpan. Muat ulang dan buang perubahan tersebut?", "You have unsaved profile or goal changes. Reload and discard them?"))) return;
    const waiting = registration.current?.waiting;
    if (!waiting) { onConfirmedReload?.(); window.location.reload(); return; }
    reloadRequested.current = true;
    setStatus("applying");
    waiting.postMessage({ type: "SKIP_WAITING" });
    window.setTimeout(() => {
      if (reloadRequested.current) { reloadRequested.current = false; setStatus("error"); }
    }, 10000);
  }

  const statusText: Record<UpdateStatus, string> = {
    idle: tr(language, "Periksa apakah ada versi baru untuk perangkat ini.", "Check for a newer version on this device."),
    checking: tr(language, "Sedang memeriksa pembaruan...", "Checking for updates..."),
    latest: tr(language, "Forkcast sudah versi terbaru.", "Forkcast is up to date."),
    available: tr(language, "Pembaruan siap dipasang.", "An update is ready to install."),
    applying: tr(language, "Memasang pembaruan...", "Installing update..."),
    offline: tr(language, "Perangkat sedang offline. Sambungkan internet lalu coba lagi.", "This device is offline. Reconnect and try again."),
    error: tr(language, "Pembaruan belum bisa diperiksa atau dipasang. Coba lagi.", "Could not check or install the update. Try again."),
    unsupported: tr(language, "Browser ini tidak mendukung pemeriksaan pembaruan PWA.", "This browser does not support PWA update checks."),
  };

  if (compact) return <button className="profile-menu-card" type="button" onClick={onOpen}>
    <span className="card-kicker">{tr(language, "APLIKASI", "APP")}</span><strong>{tr(language, "Pembaruan aplikasi", "App updates")}</strong><small>{tr(language, "Versi", "Version")} {version} · {statusText[status]}</small><span className="profile-menu-link">{tr(language, "Buka pembaruan", "Open updates")} →</span>
  </button>;

  return <section className="panel update-panel" aria-labelledby="about-forkcast">
    <div className="card-top"><div><span className="card-kicker">{tr(language, "APLIKASI", "APP")}</span><h2 id="about-forkcast">{tr(language, "Tentang Forkcast", "About Forkcast")}</h2></div><span className="card-soft-icon"><RefreshCw size={19} /></span></div>
    <div className="update-details"><span>{tr(language, "Versi aplikasi", "App version")}</span><strong>{version}</strong><span>{tr(language, "Terakhir diperiksa", "Last checked")}</span><strong>{lastCheck ? new Date(lastCheck).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" }) : tr(language, "Belum pernah", "Never")}</strong></div>
    <p className="microcopy" role="status">{statusText[status]}</p>
    <div className="profile-actions"><button className="outline-button" type="button" disabled={status === "checking" || status === "applying" || status === "unsupported"} onClick={() => void checkUpdates()}><RefreshCw size={16} /> {tr(language, "Periksa pembaruan", "Check for updates")}</button>{status === "available" && <button className="primary-button" type="button" onClick={applyUpdate}>{tr(language, "Muat ulang untuk memperbarui", "Reload to update")}</button>}</div>
  </section>;
}
