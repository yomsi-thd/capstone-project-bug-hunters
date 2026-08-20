export default function FundingBar({ percent }) {
  const clamped = Math.min(percent, 100);
  return (
    // mt-auto pushes the bar to the bottom of a card whose text is shorter than its
    // neighbours, so a row of cards lines its bars up.
    <div className="mt-auto">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-bold text-brand">{percent}%</span>
        <span className="text-[11px] text-neutral-500">Funded</span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-sm bg-neutral-200">
        {/* The width is the datum this component exists to show, so it stays inline — a
            runtime value is one of the three cases where that is still correct. */}
        <div className="h-full rounded-sm bg-brand" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
