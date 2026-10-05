import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const BASE =
  "w-full rounded-[var(--radius-md)] bg-surface-2 px-4 text-fg placeholder:text-fg-subtle/70 outline-none transition-shadow focus:ring-2 focus:ring-accent";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-fg-muted">
          {label}
        </label>
      )}
      <input ref={ref} id={fieldId} className={cn(BASE, "h-14 text-[16px]", className)} {...rest} />
      {hint && <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className, id, ...rest }: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-fg-muted">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        className={cn(BASE, "min-h-24 resize-none py-3.5 text-[15px] leading-relaxed", className)}
        {...rest}
      />
    </div>
  );
}
