import { toEmbedUrl, isLinkable } from "./videoUrl";

// The creator's pitch video on ProjectDetail. `projects.video_url` holds a LINK, never a
// file — the wizard's "upload a video file" branch was removed when the column landed,
// because a 50MB file base64'd into the project row was never going to be sent anywhere.
export default function ProjectVideo({ url }) {
  if (!url) return null;

  const embed = toEmbedUrl(url);

  return (
    <div className="mb-8">
      <h2 className="mx-0 mt-0 mb-3 text-[18px] font-extrabold text-neutral-900">
        Project Video
      </h2>

      {embed ? (
        // 16:9 through padding rather than `aspect-ratio`, so it behaves identically in
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
        // what they saved and go fix it.
        <div className="text-[13px] break-all text-neutral-500">
          {url} — this does not look like a valid video link.
        </div>
      )}
    </div>
  );
}
