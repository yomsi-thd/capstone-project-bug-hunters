import { Link } from "react-router-dom";
import Tag from "./Tag";
import FundingBar from "./FundingBar";

export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/project/${project.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{ background: "#fff", border: "1px solid #ececec", borderRadius: "8px", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s", height: "100%" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
      >
        <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
          <img src={project.img} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: "10px", left: "10px" }}>
            <Tag label={project.tag} />
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111", lineHeight: 1.35 }}>{project.title}</h3>
          {project.desc && (
            <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{project.desc}</p>
          )}
          <FundingBar percent={project.funded} />
        </div>
      </div>
    </Link>
  );
}
