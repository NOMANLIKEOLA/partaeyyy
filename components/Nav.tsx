"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NIGERIA_STATES } from "@/lib/nigeria";

export default function Nav({ initialUserEmail }: { initialUserEmail: string | null }) {
  const [openMenu, setOpenMenu] = useState<"state" | "user" | null>(null);
  const [userEmail, setUserEmail] = useState(initialUserEmail);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const activeCity = searchParams.get("city");
  const stateLabel = activeCity ?? "All states";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  function selectState(name: string | null) {
    const params = new URLSearchParams(pathname === "/" ? searchParams.toString() : "");
    if (name) {
      params.set("city", name);
    } else {
      params.delete("city");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
    setOpenMenu(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setOpenMenu(null);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between px-10 py-5 border-b border-hairline sticky top-0 z-50 bg-ink/90 backdrop-blur">
      <Link href="/" className="font-display text-xl font-bold">
        PARTAEY<span className="text-amber">.</span>
      </Link>

      <div ref={wrapRef} className="flex items-center gap-7 text-sm text-paperDim">
        <Link href="/" className="hover:text-paper transition">Discover</Link>

        <div className="relative">
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "state" ? null : "state"); }}
          >
            {stateLabel} <span className="text-[9px]">&#9662;</span>
          </button>
          {openMenu === "state" && (
            <div className="absolute left-0 top-[calc(100%+10px)] bg-panel border border-hairline rounded-xl p-2 min-w-[220px] max-h-[360px] overflow-y-auto shadow-2xl z-50">
              <div className="text-[11px] text-paperDim uppercase tracking-wide px-2.5 pt-1.5 pb-1 sticky top-0 bg-panel">
                Choose your state
              </div>
              <button
                className={`block w-full text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2 ${!activeCity ? "text-amber font-medium" : ""}`}
                onClick={() => selectState(null)}
              >
                All states - nationwide
              </button>
              <div className="h-px bg-hairline my-1 mx-1" />
              {NIGERIA_STATES.map((s) => (
                <button
                  key={s}
                  className={`block w-full text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2 ${activeCity === s ? "text-amber font-medium" : ""}`}
                  onClick={() => selectState(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            aria-label="Account menu"
            className="w-[38px] h-[38px] rounded-full border border-hairline flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "user" ? null : "user"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
              <circle cx="12" cy="8" r="3.5"></circle>
              <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5"></path>
            </svg>
          </button>
          {openMenu === "user" && (
            <div className="absolute right-0 top-[calc(100%+10px)] bg-panel border border-hairline rounded-xl p-2 min-w-[200px] shadow-2xl z-50">
              <div className="text-[11px] text-paperDim uppercase tracking-wide px-2.5 pt-1.5 pb-1">Account</div>
              {!userEmail ? (
                <>
                  <Link href="/login" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Log in</Link>
                  <Link href="/signup" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Sign up</Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Dashboard</Link>
                  <Link href="/payouts" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Payout account</Link>
                  <Link href="/profile" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Profile</Link>
                  <Link href="/contact" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Contact us</Link>
                  <div className="h-px bg-hairline my-1.5 mx-1" />
                  <button className="block w-full text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={handleSignOut}>Log out</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}