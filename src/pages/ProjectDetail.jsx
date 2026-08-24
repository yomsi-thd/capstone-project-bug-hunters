import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import DeadEndPage from "../components/layout/DeadEndPage";
import Tag from "../components/project/Tag";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import CommentList from "../components/project/CommentList";
import ProjectVideo from "../components/project/ProjectVideo";
import BackerInvestmentModal from "../components/project/BackerInvestmentModal";
import BackerInvestmentSuccessModal from "../components/project/BackerInvestmentSuccessModal";
import SupportLevels from "../components/project/SupportLevels";
import useBreakpoint from "../hooks/useBreakpoint";
import { useAuth } from "../context/AuthContext";
import * as projectApi from "../api/projectApi";
import { toDetail, toProjectUpdate, toCommentThread, toTier } from "../api/mappers";

// Plain progress track for the detail-page sidebar (no % label — the sidebar
// renders its own big % + "FUNDED" below). Distinct from the labelled card
// FundingBar in components/project/FundingBar.jsx; kept separate on purpose.
function ProgressTrack({ percent }) {
  return (
    <div className="my-2.5 h-1.5 overflow-hidden rounded-sm bg-neutral-100">
      {/* Runtime width — the datum. */}
      <div
        className="h-full rounded-sm bg-brand transition-[width] duration-[400ms] ease-out"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function TabNav({ tabs, active, onChange }) {
  return (
    <div className="mb-7 flex gap-0 border-b-2 border-neutral-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`lp-navlink relative -mb-0.5 flex cursor-pointer items-center gap-1.5 bg-none px-5 py-2.5 text-[14px] ${
            active === tab.id ? "is-active font-bold" : "font-normal"
          }`}
          // ⚠️ --nav-base stays inline: .lp-navlink reads it for its resting colour, and it
          // differs per host (Header passes #444, this passes #666). A context-set custom
          // property is one of the three cases where inline is still correct.
          style={{ "--nav-base": "#666" }}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={`rounded-[10px] px-1.5 py-px text-[10px] font-bold ${
                active === tab.id ? "bg-brand text-white" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function EndorsedBadge() {
  return (
    <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-neutral-200 px-4 py-3.5">
      <div className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <div className="mb-[3px] text-[12px] font-bold text-neutral-900">
          RMIT Endorsed Project
        </div>
        <div className="text-[12px] leading-normal text-neutral-500">
          This project has been reviewed and approved by the School of Engineering ethics and feasibility board.
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { isLoggedIn, canInvest, balance, user, refreshBalance } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("about");
  const [menuOpen, setMenuOpen] = useState(false);

  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Invest flow: closed -> "invest" modal -> "success" modal -> closed
  const [investStep, setInvestStep] = useState(null); // null | "invest" | "success"
  const [investedAmount, setInvestedAmount] = useState(0);

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [investError, setInvestError] = useState(null);

  const [comments, setComments] = useState([]);
  const [commentError, setCommentError] = useState(null);
  // Bumped after a successful post to re-run the fetch below. Refetching rather than
  // appending locally is deliberate: the author name and the CREATOR / BACKER badge are
  // both derived server-side, so an optimistic row would render without them.
  const [commentsVersion, setCommentsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getProjectComments(id);
        if (!cancelled) setComments(toCommentThread(rows || []));
      } catch {
        if (!cancelled) setComments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, commentsVersion]);

  // Comments and replies share this handler; `parentId` is null for a new thread.
  // Returns true so CommentList only clears its box when the post actually landed.
  const handlePostComment = async (text, parentId = null) => {
    setCommentError(null);
    try {
      await projectApi.postComment(id, { body: text, parentId });
      setCommentsVersion(v => v + 1);
      return true;
    } catch (err) {
      setCommentError(err.response?.data?.message || err.message || "Could not post your comment");
      return false;
    }
  };

  // Updates live on their own endpoint rather than inside the project row, so they load
  // separately. A failure here must not take the whole page down — the project itself is
  // still perfectly readable without them.
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const row = await projectApi.getProjectById(id);
        if (!cancelled) setP(toDetail(row));
      } catch (err) {
        if (cancelled) return;
        // 404 -> the project does not exist, fall through to "Project not found" below.
        if (err.response?.status === 404) setP(null);
        else setLoadError(err.response?.data?.message || err.message || "Could not load this project");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getProjectUpdates(id);
        if (!cancelled) setUpdates((rows || []).map(toProjectUpdate));
      } catch {
        if (!cancelled) setUpdates([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Support levels, on their own endpoint for the same reason the updates are: a
  // failure here must not blank a page that reads perfectly well without them.
  // `tiersVersion` is bumped after a successful investment — backersCount on each level
  // only exists server-side, so the count is refetched rather than guessed at locally.
  const [tiers, setTiers] = useState([]);
  const [tiersVersion, setTiersVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await projectApi.getProjectTiers(id);
        if (!cancelled) setTiers((rows || []).map(toTier));
      } catch {
        if (!cancelled) setTiers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, tiersVersion]);

  // `tierId` is the support level the backer picked, or null for "just support".
  const handleConfirmInvestment = async (amount, tierId = null) => {
    setInvestError(null);
    try {
      await projectApi.investProject(id, amount, tierId);
      setInvestedAmount(amount);
      setInvestStep("success");
      // Both the Header balance and the funding progress change after investing.
      refreshBalance();
      const row = await projectApi.getProjectById(id);
      setP(toDetail(row));
      // And so does the "N backers at this level" count, which is computed in SQL.
      setTiersVersion(v => v + 1);
    } catch (err) {
      setInvestStep(null);
      setInvestError(err.response?.data?.message || err.message || "Investment failed");
    }
  };

  const closeModals = () => {
    setInvestStep(null);
    setInvestedAmount(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-neutral-900">
        <Header showSearch={false} />
        <div className="mx-auto max-w-[1100px] px-6 py-20 text-center text-neutral-500">
          Loading project…
        </div>
        <Footer isMobile={isMobile} />
      </div>
    );
  }

  if (loadError) {
    return (
      <DeadEndPage icon="⚠️" title="Could not load this project" detail={loadError} />
    );
  }

  if (!p) {
    return (
      // A pending or rejected project 404s here for anyone but its creator and the
      // admins — assertVisibleTo returns "not found" rather than "forbidden", because
      // "this exists but is under review" already leaks that it exists.
      <DeadEndPage
        icon="🔍"
        title="Project not found"
        detail={`No project exists with the id “${id}”.`}
      />
    );
  }

  // The signed-in user owns this project -> they edit it instead of investing.
  // Compares the real id (projects.creator_id), not the username as the old mock did.
  const isOwner = isLoggedIn && p.ownerId != null && user?.id === p.ownerId;
  // TODO: deep-link to edit this exact project once a backed edit route exists;
  // for now send the creator to their project management page.
  const goToEdit = () => navigate("/creator-my-projects");

  const tabs = [
    { id: "about", label: "About" },
    { id: "levels", label: "Support Levels", count: tiers.length },
    { id: "updates", label: "Updates", count: updates.length },
  ];

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

      {/* Hero image */}
      <div className={`w-full overflow-hidden bg-neutral-900 ${isMobile ? "h-[220px]" : isTablet ? "h-[300px]" : "h-[380px]"}`}>
        {/* image_url may be empty — projects created via the API do not require one. */}
        {p.img && (
          <img
            src={p.img}
            alt={p.title}
            className="h-full w-full object-cover opacity-90"
          />
        )}
      </div>

      {/* Main content */}
      <div className={`lp-reveal mx-auto max-w-[1100px] ${isMobile ? "px-4 py-6" : "px-10 py-8"}`}>

        {/* An archived project stays readable rather than 404ing: the link may already
            be shared, and a backer who funded it still reaches this page from My
            Investments. It just goes read-only. */}
        {p.archived && <ArchivedBanner p={p} isOwner={isOwner} />}

        {investError && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[#f5c2c2] bg-[#fdecec] px-4 py-3 text-[13px] text-[#a11]">
            <span><strong>Investment failed.</strong> {investError}</span>
            <button
              type="button"
              onClick={() => setInvestError(null)}
              className="cursor-pointer border-none bg-none text-[16px] leading-none text-[#a11]"
            >
              ✕
            </button>
          </div>
        )}

        <div className={`grid items-start ${isDesktop ? "grid-cols-[1fr_300px] gap-10" : "grid-cols-[1fr] gap-7"}`}>

          {/* ── LEFT: Main Content ── */}
          <div>
            <Tag label={p.tag} />
            <h1 className={`mx-0 mt-2.5 mb-3.5 leading-[1.2] font-extrabold text-neutral-900 ${isMobile ? "text-[22px]" : "text-[28px]"}`}>
              {p.title}
            </h1>

            {/* Creator */}
            <div className="mb-7 flex items-center gap-2.5">
              <Avatar name={p.creator?.name} size={38} max={1} fallback="?" />
              <div>
                {/* GET /projects/:id joins users for the name and title. Both fallbacks
                    are only reachable when the creator's account was deleted, since
                    projects.creator_id cascades — so in practice, never. */}
                <div className="text-[14px] font-bold text-neutral-900">
                  {p.creator?.name ?? `Creator #${p.ownerId ?? "?"}`}
                </div>
                <div className="text-[12px] text-neutral-500">
                  {p.creator?.role ?? "Creator"}
                </div>
              </div>
            </div>

            {/* Sidebar injected here on mobile/tablet */}
            {!isDesktop && <FundingSidebar p={p} isLoggedIn={isLoggedIn} canInvest={canInvest} sticky={false} isOwner={isOwner} onEdit={goToEdit} onInvest={() => setInvestStep("invest")} />}

            {/* Tab nav */}
            <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {/* About tab content */}
            {activeTab === "about" && (
              <div>
                <p className="mx-0 mt-0 mb-7 text-[15px] leading-[1.8] text-neutral-700">
                  {p.about}
                </p>

                {/* The pitch video, directly under the opening blurb — the wizard has
                    always required one, and until 2026-08-18 there was no column to put
                    it in. Renders nothing for projects created before that. */}
                <ProjectVideo url={p.videoUrl} />

                {/* Challenge / Solution / Funding come from their own columns on
                    `projects` and are optional, so each section renders only when the
                    creator actually filled it in. Projects created before 2026-08-06
                    have none and show just the blurb above. */}
                {p.challenge && (
                  <>
                    <h2 className="mx-0 mt-0 mb-3 text-[18px] font-extrabold text-neutral-900">
                      The Challenge
                    </h2>
                    <p className="mx-0 mt-0 text-[14px] leading-[1.8] whitespace-pre-line text-neutral-600 mb-7">
                      {p.challenge}
                    </p>
                  </>
                )}

                {/* Gallery: the images uploaded in CreateProject step 2, stored as a
                    jsonb array on the project. The first one sits between The Challenge
                    and Our Solution, exactly as the original design had it. */}
                {p.gallery[0] && (
                  <div className="group mb-7 overflow-hidden rounded-[10px] bg-neutral-900">
                    <img
                      src={p.gallery[0]}
                      alt="Project gallery"
                      className="block max-h-[320px] w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-105"
                    />
                  </div>
                )}

                {p.solution && (
                  <>
                    <h2 className="mx-0 mt-0 mb-3 text-[18px] font-extrabold text-neutral-900">
                      Our Solution
                    </h2>
                    {/* Plain prose, not the old mock's { intro, bullets } object — the
                        column is a single TEXT field the creator writes freely.
                        whiteSpace preserves their paragraph breaks. */}
                    <p className={`mx-0 mt-0 text-[14px] leading-[1.8] whitespace-pre-line text-neutral-600 ${p.solutionBullets.length ? "mb-4" : "mb-7"}`}>
                      {p.solution}
                    </p>
                    {p.solutionBullets.length > 0 && (
                      <ul className="mx-0 mt-0 mb-7 flex list-none flex-col gap-2.5 p-0">
                        {p.solutionBullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 font-bold text-brand">▸</span>
                            <span className="text-[14px] leading-[1.7] text-neutral-600">
                              <strong className="text-neutral-900">{b.title}:</strong> {b.desc}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {p.funding && (
                  <>
                    <h2 className="mx-0 mt-0 mb-3 text-[18px] font-extrabold text-neutral-900">
                      How Your Funding Helps
                    </h2>
                    <p className="mx-0 mt-0 text-[14px] leading-[1.8] whitespace-pre-line text-neutral-600 mb-10">
                      {p.funding}
                    </p>
                  </>
                )}

                {/* Team members come from projects.team_members (jsonb). */}
                {p.teamMembers.length > 0 && (
                  <>
                    <h2 className="mx-0 mt-0 mb-3 text-[18px] font-extrabold text-neutral-900">
                      Team
                    </h2>
                    <ul className="mx-0 mt-0 mb-10 flex list-none flex-col gap-2 p-0">
                      {p.teamMembers.map((m, i) => (
                        <li key={i} className="text-[14px] text-neutral-600">
                          <strong className="text-neutral-900">{m.name ?? m}</strong>
                          {m.role ? ` — ${m.role}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="border-t border-neutral-200 pt-8">
                  <CommentList
                    comments={comments}
                    totalComments={comments.reduce((n, c) => n + 1 + c.replies.length, 0)}
                    isLoggedIn={isLoggedIn}
                    onPost={handlePostComment}
                    error={commentError}
                    // The backend rejects comments on an archived project, so the box is
                    // closed here rather than letting the post fail. Reading stays open.
                    locked={p.archived}
                    lockedMessage="This project has been archived. The discussion is closed."
                  />
                </div>
              </div>
            )}

            {activeTab === "levels" && (
              <SupportLevels
                levels={tiers}
                emptyMessage={
                  isOwner
                    ? "Add them from My Projects → Edit Project → Support Levels."
                    : "This project has not set any support levels."
                }
              />
            )}

            {activeTab === "updates" && (
              updates.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No updates yet"
                  detail={isOwner
                    ? "Post one from My Projects to keep your backers in the loop."
                    : "The creator has not posted an update for this project."}
                />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
                  {updates.map(u => (
                    <li key={u.id} className="border-l-[3px] border-l-brand pl-4">
                      <div className="mb-1 text-[11px] text-neutral-400">
                        {u.postedOn} · {u.author}
                      </div>
                      <h2 className="mx-0 mt-0 mb-1.5 text-[16px] font-extrabold text-neutral-900">
                        {u.title}
                      </h2>
                      {/* Plain text from the API — keep the author's line breaks. */}
                      <p className="mx-0 mt-0 text-[14px] leading-[1.8] whitespace-pre-line text-neutral-600 mb-0">
                        {u.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>

          {/* ── RIGHT: Sidebar (desktop only) ── */}
          {isDesktop && <FundingSidebar p={p} isLoggedIn={isLoggedIn} canInvest={canInvest} sticky={true} isOwner={isOwner} onEdit={goToEdit} onInvest={() => setInvestStep("invest")} />}
        </div>
      </div>

      <Footer isMobile={isMobile} />

      {investStep === "invest" && (
        <BackerInvestmentModal
          project={p}
          levels={tiers}
          balance={balance}
          onClose={closeModals}
          onConfirm={handleConfirmInvestment}
        />
      )}

      {investStep === "success" && (
        <BackerInvestmentSuccessModal
          amount={investedAmount}
          onClose={closeModals}
        />
      )}

    </div>
  );
}

// Shown at the top of an archived project. Deliberately amber, not the brand red used
// for errors — being archived is a state, not something that went wrong.
// The owner gets a different second line: they are the only visitor who can act on it,
// and where they act depends on who archived it (see CreatorMyProjects).
function ArchivedBanner({ p, isOwner }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#f0d9a0] bg-[#fff8e6] px-4 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a06a00" strokeWidth="2" className="mt-px shrink-0">
        <rect x="2" y="4" width="20" height="5" rx="1" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><line x1="10" y1="14" x2="14" y2="14" />
      </svg>
      <div className="text-[13px] leading-normal text-[#7a5200]">
        <strong>This project has been archived.</strong>{" "}
        It is no longer listed on Discover and is not accepting investments or comments.
        {p.archiveReason && (
          <div className="mt-1">
            Reason: {p.archiveReason}
          </div>
        )}
        {p.archivedByName && (
          <div className="mt-1 text-[#96702a]">
            Archived by {p.archivedByName}{p.archivedAt && ` on ${p.archivedAt}`}.
          </div>
        )}
        {isOwner && (
          <div className="mt-1.5">
            You can restore it from <strong>My Projects</strong> if you archived it yourself.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The line under a disabled INVEST button, saying WHY it is disabled.
 *
 * The button has always greyed out for anyone who cannot invest, and the note beside it
 * has always been the same "All or nothing funding model" — so a signed-out visitor,
 * who is the most common reader of this page, met a dead control with nothing pointing
 * at the way in. A pure creator got the same silence, and since 2026-08-24 so does an
 * admin.
 *
 * The two cases are different and need different answers: signed out is a door with a
 * key (sign in), while signed in without BACKER is a door that is not theirs — telling
 * them to sign in would send them round a loop they cannot finish.
 */
function InvestBlockedNote({ isLoggedIn, from }) {
  if (!isLoggedIn) {
    return (
      <p className="mx-0 mt-2 mb-0 text-center text-[11px] leading-relaxed text-neutral-500">
        {/* state.from is what Login already honours, so they come back here rather
            than being dropped on Discover after signing in. */}
        <Link
          to="/login"
          state={{ from }}
          className="font-bold text-brand underline underline-offset-2"
        >
          Sign in
        </Link>{" "}
        to invest in this project.
      </p>
    );
  }

  return (
    <p className="mx-0 mt-2 mb-0 text-center text-[11px] leading-relaxed text-neutral-500">
      Only backer accounts can invest — your account does not hold a Class Coin balance.
    </p>
  );
}

function FundingSidebar({ p, isLoggedIn, canInvest, sticky, isOwner, onEdit, onInvest }) {
  const location = useLocation();
  return (
    // ⚠️ `sticky` is a PROP, not a breakpoint utility. On mobile and tablet this card is
    // injected into the flow above the tabs, and a sticky card there would follow the
    // reader down the page and cover the content it is meant to sit beside.
    <div
      className={`rounded-[10px] border border-neutral-200 bg-white p-[22px] ${
        sticky ? "sticky top-[72px] mb-0" : "static mb-7"
      }`}
    >
      <ProgressTrack percent={p.stats.funded} />

      <div className="mb-0.5 text-[28px] font-extrabold text-brand">
        {p.stats.funded}%
      </div>
      <div className="mb-3.5 text-[11px] font-bold tracking-[0.06em] text-neutral-500">
        FUNDED
      </div>

      <div className="text-[22px] font-extrabold text-neutral-900">
        {p.stats.raised.toLocaleString()} CC
      </div>
      <div className="mb-[18px] text-[13px] text-neutral-500">
        pledged of {p.stats.goal.toLocaleString()} CC goal
      </div>

      <div className="mb-[22px] flex gap-6">
        <div>
          {/* end_date exists in the DB but createProject never writes it -> usually null. */}
          <div className="text-[20px] font-extrabold text-neutral-900">{p.stats.daysLeft ?? "—"}</div>
          <div className="text-[12px] text-neutral-500">days to go</div>
        </div>
        <div>
          {/* backers_count on GET /projects/:id — DISTINCT wallets, not transactions.
              "—" is for a row that predates the column, not for a real zero: the
              mapper's check is `== null`, so nobody-yet renders as 0. */}
          <div className="text-[20px] font-extrabold text-neutral-900">{p.stats.backers ?? "—"}</div>
          <div className="text-[12px] text-neutral-500">backers</div>
        </div>
      </div>

      {/* Archived wins over both branches below. Even the owner gets no EDIT here: the
          backend refuses to update an archived project (that refusal is what keeps
          "restore needs no re-approval" honest), so offering the button would only
          produce an error after the fact. Restoring happens in My Projects. */}
      {p.archived ? (
        <div className="rounded-md border border-dashed border-[#d4d4d0] bg-[#f6f6f4] p-3.5 text-center">
          <div className="mb-1 text-[12px] font-bold tracking-[0.06em] text-[#8a8a85]">
            ARCHIVED
          </div>
          <div className="text-[12px] leading-normal text-neutral-400">
            This project is not accepting investments.
          </div>
        </div>
      ) : isOwner ? (
        <>
          <button
            onClick={onEdit}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-brand p-3.5 text-[13px] font-bold tracking-[0.06em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_8px_20px_rgba(204,0,0,0.35)]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            EDIT THIS PROJECT
          </button>

          <p className="mx-0 mt-2 mb-0 flex items-center justify-center gap-1 text-center text-[11px] text-neutral-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            You are the creator of this project.
          </p>
        </>
      ) : (
        <>
          <button
            disabled={!canInvest}
            onClick={() => canInvest && onInvest()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-brand p-3.5 text-[13px] font-bold tracking-[0.06em] text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_8px_20px_rgba(204,0,0,0.35)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:translate-y-0 disabled:hover:bg-neutral-300 disabled:hover:shadow-none"
          >
            INVEST IN THIS PROJECT
          </button>

          {canInvest ? (
            <p className="mx-0 mt-2 mb-0 flex items-center justify-center gap-1 text-center text-[11px] text-neutral-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              All or nothing funding model.
            </p>
          ) : (
            <InvestBlockedNote isLoggedIn={isLoggedIn} from={location.pathname} />
          )}
        </>
      )}

      {p.endorsed && <EndorsedBadge />}
    </div>
  );
}


