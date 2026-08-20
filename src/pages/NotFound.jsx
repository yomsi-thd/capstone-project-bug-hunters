import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import useBreakpoint from "../hooks/useBreakpoint";

/**
 * Catch-all route.
 *
 * It used to be a bare `<h1>404 - Page Not Found</h1>` — black text on white with no
 * nav bar and no way back, which reads as a broken build rather than a wrong address.
 * The layout deliberately matches the "no access" screen in RequireAccess so the app's
 * two dead-end states look like they come from the same product.
 *
 * Unlike the ErrorBoundary fallback this one CAN use Header/Footer: nothing has crashed
 * here, the address was simply wrong.
 */
export default function NotFound() {
  const { isMobile } = useBreakpoint();

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", background: "#f7f7f5", minHeight: "100vh", color: "#111" }}>

      <Header showSearch={false} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧭</div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px" }}>This page does not exist</h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 24px" }}>
          The address you followed is wrong, or the page it pointed at has moved.
        </p>
        <Link
          to="/discover"
          style={{
            display: "inline-block", background: "var(--color-brand)", color: "#fff",
            textDecoration: "none", borderRadius: "6px",
            fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em",
            padding: "12px 28px", transition: "background 0.15s, transform 0.12s, box-shadow 0.12s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#aa0000";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(204,0,0,0.35)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--color-brand)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          BACK TO DISCOVER
        </Link>
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}
