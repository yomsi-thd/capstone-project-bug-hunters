import { Link } from "react-router-dom";
import Tag from "./Tag";
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
          {/* The card's two numbers since N3 (2026-09-07): the Class Coins this project
              has received, and the head count behind them. There is no goal any more, so
              there is no percentage and no bar. mt-auto does the job FundingBar's own
              wrapper used to — it pins this line to the bottom edge, so a row of cards
              lines its numbers up even when one description is shorter. */}
          <div className="mt-auto flex items-baseline gap-1.5 pt-1">
            <span className="text-[13px] font-bold text-brand">
              {project.raised.toLocaleString()} CC
            </span>
            {/* Hidden only for a row the API could not count — a real 0 says "0 backers",
                because nobody-yet is a fact and a blank reads as a failed load. */}
            {project.backers != null && (
              <span className="text-[11px] text-neutral-500">
                · {project.backers} {project.backers === 1 ? "backer" : "backers"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
