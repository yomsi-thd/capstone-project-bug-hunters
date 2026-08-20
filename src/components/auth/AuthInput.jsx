import { useState } from "react";

export default function AuthInput({
  label, type = "text", value, onChange, placeholder, error, rightSlot,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="mb-[18px]">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-bold tracking-[0.06em] text-neutral-500">
          {label}
        </label>
        {rightSlot}
      </div>

      <div className="relative">
        {/* The focus ring used to be a `.auth-input:focus` rule with !important on both
            declarations, injected from AuthLayout — !important was the only way to beat the
            inline border-color that used to sit on this input. With the border in a class,
            focus: wins on its own and the hack is gone. */}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-[7px] border bg-neutral-50 py-3 text-[14px] text-neutral-800 outline-none transition-[border-color,box-shadow] duration-150 focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,0,0,0.1)] disabled:cursor-not-allowed disabled:bg-[#f1f1ef] disabled:text-neutral-400 ${error ? "border-brand" : "border-neutral-200"} ${isPassword ? "pr-[42px] pl-3.5" : "px-3.5"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
            className="absolute top-1/2 right-2.5 flex -translate-y-1/2 cursor-pointer items-center border-none bg-none p-1 text-neutral-400 transition-colors duration-150 hover:text-neutral-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-[5px] text-[12px] text-brand">{error}</div>
      )}
    </div>
  );
}
