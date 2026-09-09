import { toEmbedUrl, isLinkable } from "./videoUrl";

// The creator's pitch video on ProjectDetail. video_url holds a link, never a file: the
// wizard has no upload branch, since a video base64'd into the project row would be far
// too large to send.
export default function ProjectVideo({ url }) {
  if (!url) return null;

  const embed = toEmbedUrl(url);

  return (
    <div className="mb-8">
      <h2 className="mx-0 mt-0 mb-3 text-[18px] font-extrabold text-neutral-900">
        Project Video
      </h2>

      {embed ? (
        // 16:9 through padding rather than aspect-ratio, so it behaves the same in
        // whatever browser the demo runs in.
        <div className="relative w-full overflow-hidden rounded-[10px] bg-black pt-[56.25%]">
          <iframe
            src={embed}
            title="Project video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-none"
          />
        </div>
      ) : isLinkable(url) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-semibold break-all text-brand"
        >
          {url} ↗
        </a>
      ) : (
        // Not a usable link. Shown as text rather than hidden, so the creator can see
        // what they saved and fix it.
        <div className="text-[13px] break-all text-neutral-500">
          {url} — this does not look like a valid video link.
        </div>
      )}
    </div>
  );
}
