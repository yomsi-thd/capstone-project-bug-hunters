import { Link } from "react-router-dom";
import rmitBg from "../../assets/rmit.jpg";

// Real RMIT campus photo (bundled from src/assets so it works offline too).
const BG_IMAGE = rmitBg;

export default function AuthLayout({ children, isMobile }) {
  return (
    // `padding` is derived from the breakpoint hook, so it stays inline.
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ padding: isMobile ? "24px 16px" : "40px" }}
    >
      {/* Background photo + the wash that lifts the card off it. The gradient is a runtime
          value only in the sense that it is long; it is expressed as an arbitrary Tailwind
          value so no CSS lives in this file. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,247,245,0.45)_0%,rgba(247,247,245,0.62)_100%)]" />

      {/* Two drifting blobs. The keyframes live in index.css with the rest of the motion
          vocabulary — they used to be injected by a <style> tag right here, which re-added
          them to the document on every mount and put them outside prefers-reduced-motion. */}
      <div className="lp-float-a absolute -top-20 -right-20 h-70 w-70 rounded-full bg-[radial-gradient(circle,rgba(204,0,0,0.08)_0%,transparent_70%)]" />
      <div className="lp-float-b absolute -bottom-25 -left-15 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(67,56,202,0.06)_0%,transparent_70%)]" />

      {/* Card. `.lp-reveal` replaces the local authCardIn keyframe, which was the same
          fade-and-rise the shared class already had. */}
      <div
        className="lp-reveal relative z-1 w-full max-w-[420px] rounded-[14px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)]"
        style={{ padding: isMobile ? "32px 24px" : "44px 40px" }}
      >
        <Link to="/discover" className="mb-7 block text-center no-underline">
          <div className="text-[24px] leading-[1.15] font-extrabold text-brand">
            RMIT<br /><span className="text-[18px] font-normal text-neutral-900">Launchpad</span>
          </div>
        </Link>

        {children}
      </div>
    </div>
  );
}
