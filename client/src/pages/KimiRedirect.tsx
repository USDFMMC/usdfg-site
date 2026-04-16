/** Full-page iframe: Kimi (Areigna) design reference – no USDFG branding */
export default function KimiRedirect() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      <a
        href="/"
        className="absolute top-3 left-3 z-10 px-3 py-1.5 text-xs text-white/70 hover:text-white bg-black/50 rounded backdrop-blur-sm"
      >
        ← Back to USDFG
      </a>
      <iframe
        src="/_kimi/index.html"
        title="Kimi (Areigna) reference"
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
