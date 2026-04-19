import Image from "next/image";
import Link from "next/link";

export function Toolbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto px-4 flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="HTTP File Generator icon" width={36} height={36} unoptimized />
          <span>HTTP File Generator</span>
        </Link>
      </div>
    </header>
  );
}
