import { Link } from "react-router-dom";
import rmitBg from "../../assets/rmit.jpg";

// Real RMIT campus photo (bundled from src/assets so it works offline too).
const BG_IMAGE = rmitBg;

export default function AuthLayout({ children, isMobile }) {
  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
      padding: isMobile ? "24px 16px" : "40px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />

      {/* Background image + overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(247,247,245,0.45) 0%, rgba(247,247,245,0.62) 100%)",
      }} />

      {/* Decorative floating shapes for a modern touch */}
      <div style={{
        position: "absolute", top: "-80px", right: "-80px",
        width: "280px", height: "280px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(204,0,0,0.08) 0%, transparent 70%)",
        animation: "authFloat1 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", left: "-60px",
        width: "320px", height: "320px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(67,56,202,0.06) 0%, transparent 70%)",
        animation: "authFloat2 10s ease-in-out infinite",
      }} />

      <style>{`
        @keyframes authFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }
        @keyframes authFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -15px); }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-card {
          animation: authCardIn 0.4s ease-out;
        }
        .auth-input:focus {
          border-color: var(--color-brand) !important;
          box-shadow: 0 0 0 3px rgba(204,0,0,0.1) !important;
        }
      `}</style>

      {/* Card */}
      <div
        className="auth-card"
        style={{
          position: "relative", zIndex: 1,
          background: "#fff", borderRadius: "14px",
          width: "100%", maxWidth: "420px",
          padding: isMobile ? "32px 24px" : "44px 40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <Link to="/discover" style={{ textDecoration: "none", display: "block", textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontWeight: 800, fontSize: "24px", color: "var(--color-brand)", lineHeight: 1.15 }}>
            RMIT<br /><span style={{ fontWeight: 400, fontSize: "18px", color: "#111" }}>Launchpad</span>
          </div>
        </Link>

        {children}
      </div>
    </div>
  );
}
