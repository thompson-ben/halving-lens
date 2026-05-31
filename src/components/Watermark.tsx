export function Watermark({ label = "halvinglens.com" }: { label?: string }) {
  return <div className="watermark">{label}</div>;
}
