export default function Footer({ isMobile }) {
  return (
    <footer style={{ background: "#1a1a1a", color: "#fff", padding: isMobile ? "32px 16px 24px" : "40px 40px 32px" }}>
      <div className="footer-inner" style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "0" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "16px", color: "#fff", marginBottom: "6px" }}>RMIT Launchpad</div>
          <div style={{ fontSize: "12px", color: "#888" }}>© 2026 RMIT University. All rights reserved.</div>
        </div>
        <div className="footer-links" style={{ display: "flex", gap: isMobile ? "12px" : "32px", flexWrap: "wrap" }}>
          {["About RMIT", "Research Ethics", "Terms of Service", "Privacy Policy", "Contact Support"].map(link => (
            <a key={link} href="#" style={{ fontSize: "13px", color: "#aaa", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "#aaa"}
            >{link}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
