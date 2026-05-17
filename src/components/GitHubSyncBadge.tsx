import { useEffect, useState } from "react";

export type SyncStatus = "connected" | "pending" | "success" | "failed";

const LABELS: Record<SyncStatus, string> = {
  connected: "GitHub 연결됨",
  pending: "동기화 대기 중",
  success: "동기화 성공",
  failed: "동기화 실패",
};

const DOT: Record<SyncStatus, string> = {
  connected: "bg-emerald-400",
  pending: "bg-amber-400 animate-pulse",
  success: "bg-emerald-400",
  failed: "bg-rose-500",
};

const RING: Record<SyncStatus, string> = {
  connected: "ring-emerald-400/40",
  pending: "ring-amber-400/40",
  success: "ring-emerald-400/40",
  failed: "ring-rose-500/40",
};

const STORAGE_KEY = "github_sync_status";

/**
 * 화면 우상단에 GitHub 동기화 상태를 항상 표시.
 * 다른 코드에서 상태를 바꾸려면:
 *   window.dispatchEvent(new CustomEvent("gh-sync", { detail: "pending" }))
 * 또는 localStorage.setItem("github_sync_status", "success") 후 storage 이벤트.
 */
export function GitHubSyncBadge() {
  const [status, setStatus] = useState<SyncStatus>(() => {
    if (typeof window === "undefined") return "connected";
    return (localStorage.getItem(STORAGE_KEY) as SyncStatus) || "connected";
  });
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    const onCustom = (e: Event) => {
      const next = (e as CustomEvent<SyncStatus>).detail;
      if (next) {
        setStatus(next);
        setUpdatedAt(Date.now());
        localStorage.setItem(STORAGE_KEY, next);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setStatus(e.newValue as SyncStatus);
        setUpdatedAt(Date.now());
      }
    };
    window.addEventListener("gh-sync", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("gh-sync", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const time = new Date(updatedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div
      className={`fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full bg-background/70 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-foreground shadow-lg ring-1 ${RING[status]}`}
      role="status"
      aria-live="polite"
      title={`${LABELS[status]} · ${time}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current opacity-80" aria-hidden="true">
        <path d="M12 .5C5.73.5.99 5.24.99 11.5c0 4.86 3.15 8.98 7.52 10.43.55.1.75-.24.75-.53 0-.26-.01-.95-.02-1.86-3.06.67-3.71-1.48-3.71-1.48-.5-1.27-1.22-1.6-1.22-1.6-1-.69.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.69 2.58 1.2 3.21.92.1-.72.39-1.2.7-1.48-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.92 0 0 .92-.3 3.02 1.13a10.5 10.5 0 0 1 5.5 0c2.1-1.43 3.02-1.13 3.02-1.13.6 1.52.22 2.64.11 2.92.7.77 1.13 1.75 1.13 2.95 0 4.22-2.57 5.15-5.02 5.42.4.34.76 1.02.76 2.06 0 1.49-.01 2.69-.01 3.05 0 .29.2.64.76.53 4.37-1.45 7.51-5.57 7.51-10.43C23.01 5.24 18.27.5 12 .5z" />
      </svg>
      <span className={`inline-block h-2 w-2 rounded-full ${DOT[status]}`} aria-hidden="true" />
      <span>{LABELS[status]}</span>
      <span className="text-muted-foreground tabular-nums">{time}</span>
    </div>
  );
}
