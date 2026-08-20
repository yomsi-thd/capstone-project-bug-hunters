import Modal from "../ui/Modal";
import SuccessCheck from "../ui/SuccessCheck";

import { Link } from "react-router-dom";

function genTransactionId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TX-${rand}-RMIT`;
}

export default function BackerInvestmentSuccessModal({ amount, onClose, transactionId }) {
  const txId = transactionId || genTransactionId();

  return (
    <Modal onClose={onClose} maxWidth={420} panelClassName="border-t-[5px] border-brand px-8 pt-10 pb-7 text-center">
        {/* Success icon */}
        <SuccessCheck />

        <h2 className="mx-0 mt-0 mb-3 text-[20px] font-extrabold tracking-[0.02em] text-neutral-900">
          INVESTMENT SUCCESSFUL
        </h2>

        <p className="mx-0 mt-0 mb-7 text-[14px] leading-[1.7] text-neutral-600">
          Your investment of <strong className="text-neutral-900">{amount.toLocaleString()} CC</strong> has been
          successfully processed. Thank you for acting as a catalyst for academic innovation at RMIT Launchpad.
        </p>

        <div className="mb-5 flex flex-col gap-2.5">
          <Link
            to="/investments"
            className="block w-full cursor-pointer rounded-md border-none bg-brand p-[13px] text-[13px] font-bold tracking-[0.04em] text-white no-underline transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_4px_12px_rgba(204,0,0,0.3)]"
          >
            VIEW MY INVESTMENTS
          </Link>
          <Link
            to="/discover"
            className="block w-full rounded-md border border-neutral-200 bg-white p-[13px] text-[13px] font-bold tracking-[0.04em] text-neutral-700 no-underline transition-[background,border-color] duration-150 hover:border-brand hover:bg-neutral-100"
          >
            BACK TO DISCOVER
          </Link>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <span className="text-[11px] tracking-[0.04em] text-neutral-400">
            TRANSACTION ID: {txId}
          </span>
        </div>
    </Modal>
  );
}
