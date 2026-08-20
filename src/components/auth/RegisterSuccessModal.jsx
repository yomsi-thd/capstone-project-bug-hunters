import Modal from "../ui/Modal";
import SuccessCheck from "../ui/SuccessCheck";

export default function RegisterSuccessModal({ onGoToLogin, requestedRole = null }) {
  return (
    // closable={false} is deliberate and must stay: this dialog has no onClose, because
    // the ONLY way out is GO TO LOGIN. Letting a click on the backdrop dismiss it would
    // strand the user on the registration form with an account that already exists.
    <Modal maxWidth={420} closable={false} panelClassName="border-t-[5px] border-brand px-8 pt-10 pb-7 text-center">
        <SuccessCheck />

        <h2 className="mx-0 mt-0 mb-3 text-[20px] font-extrabold tracking-[0.02em] text-neutral-900">
          ACCOUNT CREATED
        </h2>

        {requestedRole ? (
          <>
            <p className="mx-0 mt-0 mb-4 text-[14px] leading-[1.7] text-neutral-600">
              You've successfully registered as a <strong>Backer</strong>. You can sign in and start exploring right away.
            </p>
            {/* Kept as its own amber box rather than a Badge or a Notice: it is the one
                thing on this screen the reader must not skim, and it says the account
                works NOW while one role is still pending. */}
            <div className="mx-0 mt-0 mb-7 flex items-start gap-2.5 rounded-lg border border-[#f0d000] bg-[#fffbe6] px-3.5 py-3 text-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b58900" strokeWidth="2" className="mt-px shrink-0">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-[13px] leading-relaxed text-[#7a5c00]">
                Your request for <strong>{requestedRole}</strong> access has been submitted and is
                {" "}<strong>pending admin review</strong>. You'll be able to publish projects once an admin approves it.
              </span>
            </div>
          </>
        ) : (
          <p className="mx-0 mt-0 mb-7 text-[14px] leading-[1.7] text-neutral-600">
            You've successfully registered with RMIT Launchpad. Please sign in to start exploring and validating ideas.
          </p>
        )}

        <button
          onClick={onGoToLogin}
          className="block w-full cursor-pointer rounded-md border-none bg-brand p-[13px] text-[13px] font-bold tracking-[0.04em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(204,0,0,0.3)]"
        >
          GO TO LOGIN
        </button>
    </Modal>
  );
}
