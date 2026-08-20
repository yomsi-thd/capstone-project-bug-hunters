import { Link } from "react-router-dom";
import Tag from "./Tag";
import FundingBar from "./FundingBar";

export default function ProjectCard({ project }) {
  return (
    <Link to={`/project/${project.id}`} className="text-inherit no-underline">
      {/* .lp-card carries the hover lift — it is part of the shared motion vocabulary, so
          it is NOT rewritten as a hover: utility here. */}
      <div className="lp-card flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="relative h-40 overflow-hidden">
          <img src={project.img} alt={project.title} className="h-full w-full object-cover" />
          <div className="absolute top-2.5 left-2.5">
            <Tag label={project.tag} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4">
          <h3 className="m-0 text-[14px] leading-[1.35] font-bold text-neutral-900">{project.title}</h3>
          {project.desc && (
            <p className="m-0 text-[12px] leading-normal text-neutral-600">{project.desc}</p>
          )}
          <FundingBar percent={project.funded} />
        </div>
      </div>
    </Link>
  );
}
