import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Tag from "../components/project/Tag";
import EmptyState from "../components/ui/EmptyState";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";
import * as classCoinApi from "../api/classCoinApi";
import { toInvestment } from "../api/mappers";
import { errorMessage } from "../api/apiError";

function InvestmentCard({ investment, isMobile }) {
  return (
    <div className={`mb-5 flex overflow-hidden rounded-[10px] border border-neutral-200 bg-white transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${isMobile ? "flex-col" : "flex-row"}`}>
      {/* Image */}
      <div className={`shrink-0 bg-neutral-900 ${isMobile ? "h-40 w-full" : "h-auto w-[220px]"}`}>
        <img
          src={investment.img}
          alt={investment.title}
          className="block h-full w-full object-cover"
        />
      </div>

      {/* Content */}
      <div className={`flex flex-1 flex-col ${isMobile ? "p-4" : "px-6 py-5"}`}>
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h3 className="m-0 text-[18px] font-extrabold text-neutral-900">
            {investment.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* The project was archived after this investment. The card stays — nobody's
                spend history disappears because a creator or admin tidied up — but it is
                marked so the funding bar below is not read as a live campaign. */}
            {investment.archived && (
              <span className="rounded border border-[#f0d9a0] bg-[#fff8e6] px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] whitespace-nowrap text-[#7a5200]">
                ARCHIVED
              </span>
            )}
            {/* The support level this backer chose. Null for anything backed before
                2026-08-20 and for every "just support" investment, so most cards show
                nothing here. When the card covers several investments it is the HIGHEST
                level they picked — "across N investments" below already says the card is
                a total, so the two do not contradict each other. */}
            {investment.topTier && (
              <span className="rounded border border-[#f3ccd4] bg-[#fff2f4] px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] whitespace-nowrap text-[#7a1020]">
                {investment.topTier.name.toUpperCase()}
              </span>
            )}
            <Tag label={investment.tag} />
          </div>
        </div>

        <p className="mx-0 mt-0 mb-4 text-[13px] leading-relaxed text-neutral-500">
          {investment.desc}
        </p>

        <div className={`mb-4 flex flex-wrap ${isMobile ? "gap-4" : "gap-8"}`}>
          <div>
            <div className="mb-1 text-[11px] font-bold tracking-[0.05em] text-neutral-400">
              INVESTED AMOUNT
            </div>
            <div className="flex items-center gap-[5px] text-[15px] font-bold text-neutral-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-brand" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H9m0 0h4.5a1.5 1.5 0 0 1 0 3H9" />
              </svg>
              {investment.investedAmount.toLocaleString()} CC
            </div>
            {/* Only mentioned above 1: the card is now one PROJECT, so a total of
                900 CC could be one investment or three, and the difference matters
                to somebody reading their own history. */}
            {investment.investmentCount > 1 && (
              <div className="mt-[3px] text-[11px] text-neutral-500">
                across {investment.investmentCount} investments
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-[11px] font-bold tracking-[0.05em] text-neutral-400">
              {investment.investmentCount > 1 ? "LATEST INVESTMENT" : "INVESTMENT DATE"}
            </div>
            <div className="text-[15px] font-bold text-neutral-900">
              {investment.investmentDate}
            </div>
            {investment.investmentCount > 1 && (
              <div className="mt-[3px] text-[11px] text-neutral-500">
                first on {investment.firstInvestmentDate}
              </div>
            )}
          </div>

          <div className={`min-w-[140px] ${isMobile ? "flex-[0_0_100%]" : "flex-[1_1_160px]"}`}>
            <div className="mb-1 text-[11px] font-bold tracking-[0.05em] text-neutral-400">
              FUNDING PROGRESS ({investment.fundingProgress}%)
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-neutral-100">
              {/* Runtime width — the datum. */}
              <div
                className="h-full rounded-sm bg-brand"
                style={{ width: `${Math.min(investment.fundingProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex gap-2.5">
          <button className="cursor-pointer rounded-[5px] border border-neutral-200 bg-white px-[18px] py-[9px] text-[12px] font-bold tracking-[0.04em] text-neutral-700 transition-[background,border-color] duration-150 hover:border-brand hover:bg-neutral-100">
            VIEW UPDATES
          </button>
          <Link
            to={`/project/${investment.projectId}`}
            className="rounded-[5px] border-none bg-brand px-[18px] py-[9px] text-[12px] font-bold tracking-[0.04em] text-white no-underline cursor-pointer inline-block transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_4px_12px_rgba(204,0,0,0.3)]"
          >
            PROJECT PAGE
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyLoggedOut({ isMobile }) {
  return (
    <div className={`rounded-[10px] border border-dashed border-neutral-200 bg-white px-5 text-center ${isMobile ? "py-15" : "py-20"}`}>
      <div className="mb-3 text-[36px]">🔒</div>
      <h3 className="mx-0 mt-0 mb-2 text-[18px] font-extrabold text-neutral-900">
        Login to view your investments
      </h3>
      <p className="mx-auto mt-0 mb-6 max-w-[360px] text-[14px] text-neutral-500">
        Sign in to track the RMIT innovations you've backed and follow their funding progress.
      </p>
      <Link
        to="/login"
        className="inline-block rounded-md bg-brand px-7 py-3 text-[13px] font-bold tracking-[0.04em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.3)]"
      >
        LOGIN
      </Link>
    </div>
  );
}

export default function BackerInvestments() {
  // canInvest gates the empty state's wording, not the page itself — the route stays
  // open to everyone, and a pure creator can legitimately land here from a stale link.
  const { isLoggedIn, canInvest, canCreate } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const pad = isMobile ? "24px 16px" : isTablet ? "28px 24px" : "32px 40px";

  // One request. This used to read the whole ClassCoin transaction history and then call
  // GET /projects/:id once per row — an N+1 that also produced one card per TRANSACTION,
  // so backing the same project three times looked like three duplicate cards.
  // GET /classcoins/investments groups by project and joins it server-side (2026-08-18).
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await classCoinApi.getMyInvestments();
        if (!cancelled) setInvestments((rows || []).map(toInvestment));
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            errorMessage(err, "Could not load your investments")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Local filter over the user's own investments (title / tag / description).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? investments.filter(inv =>
        inv.title.toLowerCase().includes(q) ||
        (inv.tag && inv.tag.toLowerCase().includes(q)) ||
        (inv.desc && inv.desc.toLowerCase().includes(q)))
    : investments;

  return (
    <div className="min-h-screen bg-surface text-neutral-900">

      <Header
        showSearch={false}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      />

      {/* `pad` is derived from the breakpoint hook, so it stays inline. */}
      <div className="lp-stagger mx-auto max-w-[1100px]" style={{ padding: pad }}>
        <h1 className={`mx-0 mt-0 mb-1.5 font-extrabold text-neutral-900 ${isMobile ? "text-[24px]" : "text-[30px]"}`}>
          My Investments
        </h1>
        <p className="mx-0 mt-0 mb-7 text-[14px] text-neutral-500">
          Track the progress of RMIT innovations you have supported.
        </p>

        {isLoggedIn ? (
          loading ? (
            <div className="px-5 py-15 text-center text-[14px] text-neutral-500">
              Loading your investments…
            </div>
          ) : loadError ? (
            <EmptyState
              className="py-15"
              icon="⚠️"
              title={<span className="text-red-700">Could not load your investments</span>}
              detail={loadError}
            />
          ) : investments.length > 0 ? (
            <>
              {/* Local filter — sits right above the list it filters. */}
              <div className={`mb-6 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 ${isMobile ? "max-w-full" : "max-w-[380px]"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search my investments..."
                  className="w-full border-none bg-none text-[14px] text-neutral-800 outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="cursor-pointer border-none bg-none p-0 text-[14px] leading-none text-neutral-400"
                  >✕</button>
                )}
              </div>

              {filtered.length > 0 ? (
                filtered.map(inv => (
                  <InvestmentCard key={inv.id} investment={inv} isMobile={isMobile} />
                ))
              ) : (
                <EmptyState
                  className="py-12"
                  icon="🔍"
                  title={`No investments match “${query}”`}
                  detail="Try a different search term"
                />
              )}
            </>
          ) : (
            /* A pure creator holds no Class Coin balance and cannot invest, so telling
               them to "invest and it will show up here" points at a door that is locked
               for them — the Header does not even offer them a balance. Same rule as the
               nav: canInvest, not isLoggedIn. */
            canInvest ? (
              <EmptyState
                className="py-15"
                icon="💼"
                title="You haven't backed any projects yet"
                detail="Invest ClassCoins in a project and it will show up here."
              />
            ) : (
              <EmptyState
                className="py-15"
                icon="💼"
                title="This page is for backers"
                detail="Your account does not hold a Class Coin balance, so it cannot invest in projects."
              >
                {/* The CTA is gated on canCreate, not on "not canInvest": an account with
                    no roles at all reaches this branch too, and sending them to a page
                    the route guard rejects would just swap one dead end for another. */}
                {canCreate && (
                  <Link
                    to="/creator-my-projects"
                    className="inline-block rounded-md bg-brand px-[22px] py-2.5 text-[12px] font-bold tracking-[0.06em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_8px_20px_rgba(204,0,0,0.35)]"
                  >
                    GO TO MY PROJECTS
                  </Link>
                )}
              </EmptyState>
            )
          )
        ) : (
          <EmptyLoggedOut isMobile={isMobile} />
        )}
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
