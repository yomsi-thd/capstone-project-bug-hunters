// The "there is nothing here" block: icon, title, optional detail, optional call to
// action. One component, because hand-written copies drifted on spacing and grey shade
// until two empty screens read as two different products.
//
// An absent CTA renders nothing rather than an empty wrapper: a band of white space under
// an empty message reads as a page that never finished loading.
//
// `className` is for vertical padding, which genuinely differs by site (a tab panel, a
// grid cell, a whole empty page), and for layout hooks like col-span-full. It is not a
// way to restyle the block; the icon, title and detail sizes are the point.
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
