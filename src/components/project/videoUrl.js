// URL handling for the creator's pitch video, kept out of ProjectVideo.jsx so that file
// exports nothing but a component, which react-refresh requires.
//
// The stored value is whatever the creator pasted, so treat it as untrusted: embed it
// only when it parses as a YouTube or Vimeo link, and put it in an href only when it
// parses as http(s). A `javascript:` value in an href would run on click.

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
  // Only these two, so `javascript:` and `data:` never reach an href.
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url;
}

/**
 * A YouTube or Vimeo link -> the URL an <iframe> can load. Null when the link is valid
 * but not embeddable, such as Google Drive, which is the caller's cue to render a plain
 * link rather than an empty player.
 */
export function toEmbedUrl(raw) {
  const url = parse(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.includes(host)) {
    // youtu.be/<id>, /embed/<id> and /shorts/<id> carry the id in the path, while the
    // classic watch URL has it in ?v=. Taking just the id drops the ?si= that YouTube's
    // Copy link button appends, and any &t= timestamp.
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
