import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import useBreakpoint from "../../hooks/useBreakpoint";

// The full-page dead-end screen, shared by the two the app has: NotFound for a wrong
// address, and RequireAccess's NotAuthorized for a signed-in user with the wrong role.
// They differ only in an icon and two sentences, so they share one component.
//
// ErrorBoundary does not use this. This screen renders Header and Footer and calls
// useBreakpoint, which is safe because nothing has crashed: only the address or the role
// was wrong. ErrorBoundary's fallback depends on none of that, since the crash it is
// catching may have come from the header or from AuthContext itself.
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
