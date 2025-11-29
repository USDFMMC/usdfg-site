export function isMobileSafari() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/i.test(ua);
  const webkit = /WebKit/i.test(ua);
  const isChrome = /CriOS/i.test(ua);
  const isFirefox = /FxiOS/i.test(ua);

  return iOS && webkit && !isChrome && !isFirefox;
}

