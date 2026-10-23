/* eslint-disable @next/next/no-img-element */
export default function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Frères en Guerre"
      width={size}
      height={size}
      className={`logo-img ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
