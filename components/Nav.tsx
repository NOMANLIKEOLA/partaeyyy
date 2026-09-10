"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NIGERIA_STATES } from "@/lib/nigeria";

export default function Nav({
  initialUserEmail,
  isAdmin
}: {
  initialUserEmail: string | null;
  isAdmin: boolean;
}) {
  const [openMenu, setOpenMenu] = useState<"state" | "user" | null>(null);
  const [userEmail, setUserEmail] = useState(initialUserEmail);
  const [stateSearch, setStateSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const activeCity = searchParams.get("city");
  const stateLabel = activeCity ?? "All states";
  const filteredStates = NIGERIA_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.trim().toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (openMenu === "state") {
      setStateSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [openMenu]);

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
    <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 border-b border-hairline sticky top-0 z-50 bg-ink/90 backdrop-blur">
      <Link href="/" className="font-display text-lg sm:text-xl font-bold shrink-0">
        PARTAEY<span className="text-amber">.</span>
      </Link>

      <div ref={wrapRef} className="flex items-center gap-2 sm:gap-4 md:gap-7 text-sm text-paperDim">
        <Link href="/" className="hidden sm:inline hover:text-paper transition">Discover</Link>

        <div className="relative">
          <button
            className="btn-ghost flex items-center gap-1.5 !px-2.5 sm:!px-4 text-[12px] sm:text-sm max-w-[92px] sm:max-w-none truncate"
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "state" ? null : "state"); }}
          >
            <span className="truncate">{stateLabel}</span> <span className="text-[9px] shrink-0">&#9662;</span>
          </button>
          {openMenu === "state" && (
            <div className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-[64px] sm:top-[calc(100%+10px)] bg-panel border border-hairline rounded-xl p-2 sm:min-w-[220px] max-h-[380px] flex flex-col shadow-2xl z-50">
              <div className="text-[11px] text-paperDim uppercase tracking-wide px-2.5 pt-1.5 pb-1">
                Choose your state
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                placeholder="Search states..."
                className="mx-1 mb-1.5 px-2.5 py-2 rounded-lg bg-panel2 border border-hairline text-[13px] outline-none focus:border-amber"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="overflow-y-auto">
                {!stateSearch && (
                  <>
                    <button
                      className={`block w-full text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2 ${!activeCity ? "text-amber font-medium" : ""}`}
                      onClick={() => selectState(null)}
                    >
                      All states — nationwide
                    </button>
                    <div className="h-px bg-hairline my-1 mx-1" />
                  </>
                )}

                {filteredStates.length === 0 ? (
                  <div className="px-2.5 py-3 text-[13px] text-paperDim">No states match "{stateSearch}"</div>
                ) : (
                  filteredStates.map((s) => (
                    <button
                      key={s}
                      className={`block w-full text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2 ${activeCity === s ? "text-amber font-medium" : ""}`}
                      onClick={() => selectState(s)}
                    >
                      {s}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            aria-label="Account menu"
            className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border border-hairline flex items-center justify-center shrink-0"
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "user" ? null : "user"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px] sm:w-[17px] sm:h-[17px]">
              <circle cx="12" cy="8" r="3.5"></circle>
              <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5"></path>
            </svg>
          </button>
          {openMenu === "user" && (
            <div className="absolute right-0 top-[calc(100%+10px)] bg-panel border border-hairline rounded-xl p-2 min-w-[190px] shadow-2xl z-50">
              <div className="text-[11px] text-paperDim uppercase tracking-wide px-2.5 pt-1.5 pb-1">Account</div>
              {!userEmail ? (
                <>
                  <Link href="/login" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Log in</Link>
                  <Link href="/signup" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Sign up</Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Dashboard</Link>
                  <Link href="/my-events" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>My events</Link>
                  <Link href="/payouts" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Payout account</Link>
                  <Link href="/profile" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Profile</Link>
                  <Link href="/contact" className="block px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-panel2" onClick={() => setOpenMenu(null)}>Contact us</Link>
                  {isAdmin && (
                    <>
                      <div className="h-px bg-hairline my-1.5 mx-1" />
                      <Link href="/admin" className="block px-2.5 py-2 rounded-lg text-[13.5px] text-amber hover:bg-panel2" onClick={() => setOpenMenu(null)}>Admin dashboard</Link>
                    </>
                  )}
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