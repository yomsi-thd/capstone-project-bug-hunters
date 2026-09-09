import { useState } from "react";

import { ROLE_BADGE } from "../../mock";
import { validateTeamMember } from "./teamRules";
import Avatar from "../ui/Avatar";

/**
 * The Team tab of EditProject: the only way to change a team list after the project has
 * been filed.
 *
 * It lives here rather than inside the page because a page module that also exports a
 * component fails the react-refresh rule, and because the add and remove behaviour is
 * worth testing without rendering the whole five-tab editor.
 *
 * The email is not decoration. It is what the server matches a reader against when
 * deciding whether they may support this project, so this form is where somebody
 * corrects an address they mistyped.
 */
export default function TabTeam({ team, setTeam }) {
  const [newMember, setNewMember] = useState({ name: "", role: "", email: "" });
  const [error, setError] = useState(null);

  // A member is worth a row as soon as they have a name. The email stays optional: it
  // only decides whether that person is stopped from supporting the project, and a
  // member with no account has nothing to stop.
  const addMember = () => {
    const problem = validateTeamMember(newMember);

    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setTeam([
      ...team,
      {
        ...newMember,
        name: newMember.name.trim(),
        email: newMember.email.trim(),
        id: Date.now(),
      },
    ]);
    setNewMember({ name: "", role: "", email: "" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] font-bold text-gray-900">Current Team</div>
      <div className="flex flex-col gap-2">
        {team.map(m => (
          <div key={m.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border border-gray-100 gap-2 sm:gap-0">
            <div className="flex items-center gap-2.5">
              <Avatar name={m.name} size={32} tone="blue" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-gray-900">{m.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${ROLE_BADGE[m.role] || "bg-gray-100 text-gray-600"}`}>{m.role}</span>
                </div>
                <div className="text-[11px] text-gray-400">{m.email || "No email"}</div>
              </div>
            </div>
            <div className="flex gap-3 self-end sm:self-auto">
              <button onClick={() => setTeam(team.filter(t => t.id !== m.id))} className="bg-transparent border-none text-[12px] text-brand font-semibold cursor-pointer hover:underline">Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-4">
        <div className="text-[13px] font-bold text-gray-900 mb-2.5">Add a Member</div>
        <div className="flex flex-col gap-2">
          <input value={newMember.name} onChange={e => { setNewMember({ ...newMember, name: e.target.value }); setError(null); }} placeholder="Enter member name" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none bg-white focus:border-brand transition-colors">
            <option value="">Select a role...</option>
            <option>Lead Researcher</option>
            <option>Student Developer</option>
            <option>Co-Investigator</option>
          </select>
          <input value={newMember.email} onChange={e => { setNewMember({ ...newMember, email: e.target.value }); setError(null); }} placeholder="name@example.com" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-brand transition-colors" />
          {error && <p role="alert" className="m-0 text-[12px] text-brand">{error}</p>}
          <button onClick={addMember} className="w-full bg-brand hover:bg-brand-dark text-white border-none rounded-md px-3 py-2 text-[13px] font-bold cursor-pointer transition-colors">ADD MEMBER</button>
        </div>
      </div>
    </div>
  );
}
