import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MotionRoot } from "@/components/motion/MotionRoot";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-svh bg-blanc-casse">
      <MotionRoot />
      <div className="mx-auto max-w-md px-4 pt-5">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          aria-label="Retour à l'accueil"
          className="press group inline-grid size-11 place-items-center rounded-full bg-white text-noir shadow-sm ring-1 ring-black/5 transition hover:text-vert hover:ring-vert/40"
        >
          <ArrowLeft
            className="size-5 transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
      <div className="page-fade">{children}</div>
    </div>
  );
}
