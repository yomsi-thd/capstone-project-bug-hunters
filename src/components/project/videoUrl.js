// URL handling for the creator's pitch video, kept out of ProjectVideo.jsx so that file
// only exports a component (react-refresh/only-export-components).
//
// The stored value is whatever the creator pasted, so it is treated as untrusted: it is
// only embedded when it parses as a YouTube or Vimeo link, and only ever put in an href
// when it parses as http(s) — a `javascript:` value there would run on click.

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"];
const VIMEO_HOSTS = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];

/** A safe http(s) URL object, or null. */
function parse(raw) {
  if (!raw || typeof raw !== "string") return null;
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  // Only these two. `javascript:`, `data:` and friends never reach an href.
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url;
}

/**
 * A YouTube/Vimeo link -> the URL an <iframe> can load. Null when the link is fine but
 * not embeddable (Google Drive, a university media server), which is the caller's cue to
 * render a plain link instead of an empty player.
 */
export function toEmbedUrl(raw) {
  const url = parse(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.includes(host)) {
    // youtu.be/<id>, /embed/<id> and /shorts/<id> all carry the id in the path; the
    // classic watch URL carries it in ?v=. Reading only the id is what drops the
    // ?si=… that YouTube's "Copy link" button appends, and the &t= timestamp.
    const segments = url.pathname.split("/").filter(Boolean);
    let id;
    if (host.endsWith("youtu.be")) {
      id = segments[0];
    } else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
      id = segments[1];
    } else {
      id = url.searchParams.get("v");
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (VIMEO_HOSTS.includes(host)) {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}

/** True when the value is safe to put in an href. */
export function isLinkable(raw) {
  return parse(raw) !== null;
}
