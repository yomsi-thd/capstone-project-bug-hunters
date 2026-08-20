// The "there is nothing here" block: icon, title, optional detail, optional call to
// action.
//
// About eleven places wrote this by hand and drifted on vertical rhythm and grey shade, so
// two empty screens next to each other read as two different products.
//
// `detail` and the CTA are both optional, and an absent CTA renders NOTHING rather than an
// empty wrapper — a band of white space under an empty message reads as a page that failed
// to finish loading, which is the exact impression an empty state has to avoid.
// `className` exists for the vertical padding, which is genuinely different per site
// (40px in a tab panel, 48px in a grid cell, 60px on a whole empty page) and for the odd
// layout hook like `col-span-full`. It is NOT a way to re-style the block — the icon,
// title and detail sizes are the point of having this component.
export default function EmptyState({ icon = "◎", title, detail, compact = false, className = "", children }) {
  return (
    <div className={`text-center text-neutral-400 ${compact ? "py-4" : "py-10"} ${className}`}>
      <div className={`mb-2 leading-none ${compact ? "text-[22px]" : "text-[32px]"}`}>{icon}</div>
      <div className="text-[14px] font-semibold text-neutral-600">{title}</div>
      {detail && (
        <div className="mx-auto mt-1 max-w-[420px] text-[13px] leading-relaxed">{detail}</div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
