import { useSyncExternalStore } from "react";

type InstallHintProps = {
  dismissed: boolean;
  onDismiss: () => void;
};

export function InstallHint({ dismissed, onDismiss }: InstallHintProps) {
  const canInstall = useSyncExternalStore(subscribeToNothing, getInstallSnapshot, () => false);
  const visible = canInstall && !dismissed;

  if (!visible) return null;

  return (
    <button
      className="glass fixed inset-x-5 bottom-24 z-20 mx-auto max-w-xs rounded-full px-4 py-3 text-sm lowercase text-[color:var(--muted)]"
      type="button"
      onClick={onDismiss}
    >
      tap share, then add to home screen
    </button>
  );
}

function subscribeToNothing() {
  return () => undefined;
}

function getInstallSnapshot(): boolean {
  const ua = window.navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  const isStandalone =
    "standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return isIOS && isSafari && !isStandalone;
}
