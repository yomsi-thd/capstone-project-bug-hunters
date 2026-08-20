import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import useBreakpoint from "../../hooks/useBreakpoint";

// The full-page "you have hit a wall" screen, shared by the two dead ends the app has:
// NotFound (wrong address) and RequireAccess's NotAuthorized (signed in, wrong role).
//
// They were two hand-written copies differing only in an emoji and two sentences, and
// NotFound's own comment said the layout "deliberately matches the no access screen" —
// which is a duplicate maintained by hand and a promise to keep matching. This is that
// promise, expressed once.
//
// ⚠️ NOT used by ErrorBoundary, and that is the point of the distinction: this component
// renders Header and Footer and calls useBreakpoint. On these two screens nothing has
// crashed — the address was wrong or the role was — so the app around them still works.
// ErrorBoundary's fallback deliberately depends on none of that, because the crash it is
// catching may have come FROM the header or from AuthContext.
export default function DeadEndPage({ icon, title, detail }) {
  const { isMobile } = useBreakpoint();

  return (
    <div className="min-h-screen bg-surface text-neutral-900">
      <Header showSearch={false} />

      <div className="mx-auto max-w-[1100px] px-6 py-20 text-center">
        <div className="mb-2 text-[32px]">{icon}</div>
        <h1 className="mx-0 mt-0 mb-1.5 text-[20px] font-extrabold">{title}</h1>
        <p className="mx-0 mt-0 mb-6 text-[14px] text-neutral-500">{detail}</p>
        <Link
          to="/discover"
          className="inline-block rounded-md bg-brand px-7 py-3 text-[13px] font-bold tracking-[0.06em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_8px_20px_rgba(204,0,0,0.35)]"
        >
          BACK TO DISCOVER
        </Link>
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
