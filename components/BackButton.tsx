import Link from "next/link";

export default function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back-link">
      <span aria-hidden>&larr;</span> {label}
    </Link>
  );
}