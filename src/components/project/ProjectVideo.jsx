import { toEmbedUrl, isLinkable } from "./videoUrl";

// The creator's pitch video on ProjectDetail. `projects.video_url` holds a LINK, never a
// file — the wizard's "upload a video file" branch was removed when the column landed,
// because a 50MB file base64'd into the project row was never going to be sent anywhere.
export default function ProjectVideo({ url }) {
  if (!url) return null;

  const embed = toEmbedUrl(url);

  return (
    <div style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111", margin: "0 0 12px" }}>
        Project Video
      </h2>

      {embed ? (
        // 16:9 through padding rather than `aspect-ratio`, so it behaves identically in
        // whatever browser the demo runs in.
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "10px", overflow: "hidden", background: "#000" }}>
          <iframe
            src={embed}
            title="Project video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : isLinkable(url) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "14px", color: "var(--color-brand)", fontWeight: 600, wordBreak: "break-all" }}
        >
          {url} ↗
        </a>
      ) : (
        // Not a usable link. Shown as text rather than hidden, so the creator can see
        // what they saved and go fix it.
        <div style={{ fontSize: "13px", color: "#888", wordBreak: "break-all" }}>
          {url} — this does not look like a valid video link.
        </div>
      )}
    </div>
  );
}
