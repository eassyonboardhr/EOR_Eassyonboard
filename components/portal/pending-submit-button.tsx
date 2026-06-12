"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  children: React.ReactNode;
  className: string;
  pendingText?: React.ReactNode;
  name?: string;
  value?: string;
  disabled?: boolean;
};

export function PendingSubmitButton({ children, className, pendingText, name, value, disabled = false }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${className} disabled:pointer-events-none disabled:opacity-70`}
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          <span>{pendingText ?? "Working..."}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
