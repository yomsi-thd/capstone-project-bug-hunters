import DeadEndPage from "../components/layout/DeadEndPage";

/**
 * Catch-all route. The screen itself is DeadEndPage, shared with RequireAccess's "no
 * access" state so the two cannot drift apart.
 *
 * It matters that this looks like a page rather than a bare heading on white: without a
 * nav bar and a way back, a wrong address reads as a broken build.
 */
export default function NotFound() {
  return (
    <DeadEndPage
      icon="🧭"
      title="This page does not exist"
      detail="The address you followed is wrong, or the page it pointed at has moved."
    />
  );
}
