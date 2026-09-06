import { Link } from "react-router-dom";
import Tag from "./Tag";
import FundingBar from "./FundingBar";
import Badge from "../ui/Badge";

// `semesterName` is passed in rather than read off the project: GET /projects sends the
// semester id only, and the page resolving it from the list it already loaded is what
// keeps the app's busiest query from JOINing a table for one short string. Absent (an
// older row with no semester, or the list failing to load) the chip simply is not drawn.
export default function ProjectCard({ project, semesterName = null }) {
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
          {semesterName && (
            <Badge size="sm" className="self-start">{semesterName}</Badge>
          )}
          {project.desc && (
            <p className="m-0 text-[12px] leading-normal text-neutral-600">{project.desc}</p>
          )}
          <FundingBar percent={project.funded} />
        </div>
      </div>
    </Link>
  );
}
