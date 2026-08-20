const FOOTER_LINKS = [
  "About RMIT",
  "Research Ethics",
  "Terms of Service",
  "Privacy Policy",
  "Contact Support",
];

export default function Footer({ isMobile }) {
  return (
    // isMobile comes from the breakpoint hook rather than from a media query, so the two
    // responsive switches below stay inline. Everything else is Tailwind.
    <footer
      className="bg-neutral-900 text-white"
      style={{ padding: isMobile ? "32px 16px 24px" : "40px 40px 32px" }}
    >
      <div
        className="mx-auto flex max-w-[1100px] items-start justify-between"
        style={{ flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "0" }}
      >
        <div>
          <div className="mb-1.5 text-[16px] font-extrabold text-white">RMIT Launchpad</div>
          <div className="text-[12px] text-neutral-500">© 2026 RMIT University. All rights reserved.</div>
        </div>
        <div className="flex flex-wrap" style={{ gap: isMobile ? "12px" : "32px" }}>
          {FOOTER_LINKS.map(link => (
            <a
              key={link}
              href="#"
              className="text-[13px] text-neutral-400 no-underline transition-colors hover:text-white"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
