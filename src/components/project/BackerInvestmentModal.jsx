import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import { useState } from "react";
import { parseAmount } from "../../api/mappers";
import { meetsMinimum } from "./tierRules";
import { MAX_CONTRIBUTION, validateContribution } from "./investmentRules";

const QUICK_AMOUNTS = [25, 50, 100];

export default function BackerInvestmentModal({ project, levels = [], balance, onClose, onConfirm, onRequestCoins }) {
  const [amount, setAmount] = useState(0);
  // null means "just support", which is a real choice and the default.
  const [selectedTierId, setSelectedTierId] = useState(null);

  const selectedTier = levels.find(l => l.id === selectedTierId) || null;
  const belowMinimum = selectedTier != null && !meetsMinimum(amount, selectedTier);

  const handleQuickAmount = (val) => setAmount(val);

  // min(balance, cap), never the balance alone. This is the only control that types an
  // amount in for the user, so it must not fill in one the API would refuse. The label
  // shows this same number: a button whose text and behaviour disagree is worse than no
  // button.
  const maxAllowed = Math.min(balance, MAX_CONTRIBUTION);
  const handleMax = () => setAmount(maxAllowed);

  const handleInputChange = (e) => {
    // parseAmount returns 0 for an empty or unreadable field, so only the caps below
    // are left to apply.
    setAmount(Math.min(parseAmount(e.target.value, { integer: true }), balance, MAX_CONTRIBUTION));
  };

  // Picking a level fills its minimum in. Typing more afterwards is fine; typing less
  // disables CONFIRM and explains why, but does not clear the selection. Undoing
  // somebody's choice for them is worse than telling them it doesn't fit.
  const handleSelectTier = (tier) => {
    if (tier === null) {
      setSelectedTierId(null);
      return;
    }
    setSelectedTierId(tier.id);
    if (amount < tier.minAmount) setAmount(Math.min(tier.minAmount, balance));
  };

  // One source for the amount rules, shared with anything else that judges an amount.
  const amountError = validateContribution(amount, balance);

  // An empty wallet gets its own screen rather than a form with every control disabled,
  // which gave a new account no reason and no way forward.
  //
  // This early return has to stay below the hooks. Returning above one changes how many
  // hooks run between renders, and React throws as soon as the balance stops being 0.
  if (balance <= 0) {
    return (
      <Modal onClose={onClose} maxWidth={440} panelClassName="p-7">
        <EmptyState
          icon="◍"
          title="Your wallet is empty"
          detail="Class Coins are issued by an administrator. Ask for some and this project will be waiting."
        >
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              NOT NOW
            </button>
            <button
              type="button"
              onClick={onRequestCoins}
              className="cursor-pointer rounded-md border-none bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
            >
              REQUEST CLASS COINS
            </button>
          </div>
        </EmptyState>
      </Modal>
    );
  }
  const isValid = amountError === null && !belowMinimum;

  return (
    <Modal onClose={onClose} maxWidth={550} panelClassName="border-t-[5px] border-brand">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-[30px] py-6">
          <h2 className="m-0 text-[22px] font-extrabold text-neutral-900">
            Invest in Innovation
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded border-none bg-none p-1 text-[24px] leading-none text-neutral-500 transition-[color,background] duration-150 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-[30px]">
          {/* Project info */}
          <div className="mb-[30px] flex items-center gap-[15px] rounded-lg border border-neutral-100 p-[15px]">
            <div className="h-[65px] w-[65px] shrink-0 overflow-hidden rounded-md bg-neutral-900">
              <img src={project.img} alt={project.title} className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[17px] font-bold text-neutral-900">{project.title}</div>
              <div className="text-[14px] text-neutral-500">{project.creator.name}, {project.creator.role.split(",").pop().trim()}</div>
            </div>
          </div>

          {/* Support levels. The whole block is skipped when the project has none, so
              a project without levels keeps exactly the modal it had before. */}
          {levels.length > 0 && (
            <div className="mb-[26px]">
              <div className="mb-2.5 text-[13px] font-bold tracking-[0.05em] text-neutral-500">
                SUPPORT LEVEL (OPTIONAL)
              </div>

              <div className="flex flex-col gap-2">
                {levels.map(level => {
                  const affordable = level.minAmount <= balance;
                  const chosen = selectedTierId === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => affordable && handleSelectTier(level)}
                      disabled={!affordable}
                      className={`w-full rounded-lg border px-3.5 py-3 text-left transition-[border-color,background] duration-150 ${chosen ? "border-brand bg-[#fff8f8]" : "border-neutral-200 bg-white hover:border-neutral-300"} ${affordable ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-50"}`}
                    >
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="text-[14px] font-bold text-neutral-900">{level.name}</span>
                        <span className="text-[13px] font-extrabold whitespace-nowrap text-brand">
                          {level.minAmount.toLocaleString()} CC+
                        </span>
                      </div>
                      {level.bullets.length > 0 && (
                        <div className="mt-1 text-[12px] leading-normal text-neutral-500">
                          {level.bullets[0]}
                          {level.bullets.length > 1 && ` +${level.bullets.length - 1} more`}
                        </div>
                      )}
                      {/* The reason, not just a greyed-out row - the quick-amount
                          buttons already dim the same way when they exceed the balance. */}
                      {!affordable && (
                        <div className="mt-1 text-[11px] text-[#b06]">
                          Needs more Class Coins than you have.
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* A first-class choice, not a fallback: investing without declaring a
                    level is perfectly normal and must not look like a mistake. */}
                <button
                  type="button"
                  onClick={() => handleSelectTier(null)}
                  className={`w-full rounded-lg border px-3.5 py-3 text-left transition-[border-color,background] duration-150 cursor-pointer text-[14px] font-bold text-neutral-900 ${selectedTierId === null ? "border-brand bg-[#fff8f8]" : "border-neutral-200 bg-white hover:border-neutral-300"}`}
                >
                  No level - just support
                </button>
              </div>

              {/* Without this line the code is "record which level was chosen" and every
                  reader still understands "buy a reward". It is what makes the feature
                  mean what the team decided it means. */}
              <p className="mx-0 mt-2.5 mb-0 text-[12px] leading-relaxed text-neutral-400 italic">
                Levels tell the creator what backers care about - they are not rewards,
                and nothing is owed or shipped.
              </p>
            </div>
          )}

          {/* Amount input */}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] font-bold tracking-[0.05em] text-neutral-500">
              INVESTMENT AMOUNT (CC)
            </span>
            <span className="text-[14px] text-neutral-500">
              Balance: <strong className="text-brand">{balance.toLocaleString()} CC</strong>
            </span>
          </div>

          {/* focus-within replaces an `inputFocused` useState plus onFocus and onBlur
              handlers, whose only job was to move the ring from the input onto its
              wrapper. CSS can express that directly. */}
          <div className="mb-[18px] flex items-center rounded-md border border-neutral-200 px-5 py-[15px] transition-[border-color,box-shadow] duration-150 focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(204,0,0,0.1)]">
            <span className="mr-2.5 text-[27px] font-extrabold text-brand">CC</span>
            <input
              value={amount === 0 ? "" : amount}
              onChange={handleInputChange}
              placeholder="0"
              inputMode="numeric"
              className="flex-1 border-none bg-transparent text-right text-[27px] font-extrabold text-neutral-900 outline-none"
            />
          </div>

          {/* The rule a backer meets here for the first time. It says "per project"
              rather than "per person" because that is the shape of the limit: they can
              still back everything else on Discover. */}
          <p className="mt-[-10px] mb-[18px] text-[12px] text-neutral-500">
            One contribution per project, up to {MAX_CONTRIBUTION.toLocaleString()} CC.
          </p>

          {belowMinimum && (
            <div className="mt-[-8px] mb-[18px] text-[13px] font-semibold text-brand">
              &ldquo;{selectedTier.name}&rdquo; needs at least {selectedTier.minAmount.toLocaleString()} CC.
              Raise the amount, or choose &ldquo;No level - just support&rdquo;.
            </div>
          )}

          {/* Quick amount buttons */}
          <div className="mb-6 flex gap-2.5">
            {QUICK_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => handleQuickAmount(val)}
                disabled={val > balance}
                className={`flex-1 cursor-pointer rounded-md border px-2 py-3.5 text-[14px] font-bold transition-[transform,box-shadow,background,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                  amount === val
                    ? "border-brand bg-brand text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-brand hover:bg-neutral-100"
                } hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.12)] active:translate-y-0 active:scale-[0.97]`}
              >
                {val} CC
              </button>
            ))}
          </div>

          <button
            onClick={handleMax}
            className={`mb-6 w-full cursor-pointer rounded-md border border-neutral-200 p-3 text-[13px] font-bold transition-[background,border-color] duration-150 ${
              amount === maxAllowed
                ? "bg-brand text-white"
                : "bg-white text-neutral-700 hover:border-brand hover:bg-neutral-100"
            }`}
          >
            MAX ({maxAllowed.toLocaleString()} CC)
          </button>

          {/* Disclaimer */}
          <div className="mb-[30px] rounded border-l-[3px] border-l-[#cc8800] bg-[#faf7f2] px-[18px] py-4 text-[14px] leading-[1.7] text-neutral-600">
            By confirming this investment, you agree to the{" "}
            <span className="font-semibold text-brand">Terms of Catalyst Funding</span>.
            Class Coins represent academic backing and hold no real-world financial value outside the RMIT ecosystem.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-md border border-neutral-200 bg-white p-[15px] text-[15px] font-bold text-neutral-700 transition-[background,border-color] duration-150 hover:border-neutral-300 hover:bg-neutral-100"
            >
              CANCEL
            </button>
            <button
              onClick={() => isValid && onConfirm(amount, selectedTierId)}
              disabled={!isValid}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-brand p-[15px] text-[15px] font-bold text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-brand-dark hover:shadow-[0_4px_12px_rgba(204,0,0,0.3)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:translate-y-0 disabled:hover:bg-neutral-300 disabled:hover:shadow-none"
            >
              CONFIRM INVESTMENT
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
    </Modal>
  );
}
