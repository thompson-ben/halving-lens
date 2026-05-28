export function Watermark({ label = "halving.lens" }: { label?: string }) {
  return <div className="watermark">{label}</div>;
}
