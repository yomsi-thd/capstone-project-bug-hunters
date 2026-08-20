import DeadEndPage from "../components/layout/DeadEndPage";

/**
 * Catch-all route.
 *
 * It used to be a bare `<h1>404 - Page Not Found</h1>` — black text on white with no nav
 * bar and no way back, which reads as a broken build rather than a wrong address.
 *
 * The whole screen is DeadEndPage now, shared with RequireAccess's "no access" state.
 * The two used to be hand-written copies with a comment promising they would keep
 * matching; sharing the component is that promise made structural.
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
