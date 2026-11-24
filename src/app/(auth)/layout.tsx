import Link from "next/link";
import { MotionRoot } from "@/components/motion/MotionRoot";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-svh bg-blanc-casse">
      <MotionRoot />
      <div className="mx-auto max-w-md px-4 pt-5">
        <Link
          href="/"
          className="press inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-gris-fonce ring-1 ring-black/5 backdrop-blur hover:text-vert"
        >
          ← Boutique
        </Link>
      </div>
      <div className="page-fade">{children}</div>
    </div>
  );
}
