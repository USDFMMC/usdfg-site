type Props = { text: string };

export default function FullScreenLoader({ text }: Props) {
  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex items-center justify-center">
      <p className="text-white/80 text-sm">{text}</p>
    </div>
  );
}
