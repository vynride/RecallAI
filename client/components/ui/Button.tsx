import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-cohere-black active:scale-[0.98] transition",
  secondary:
    "bg-transparent text-ink underline underline-offset-4 decoration-1 hover:decoration-2 transition",
  outline:
    "bg-transparent text-primary border border-primary/80 hover:bg-primary hover:text-on-primary transition",
  ghost:
    "bg-transparent text-ink hover:bg-soft-stone transition",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-10 px-5 text-sm rounded-pill",
  lg: "h-12 px-7 text-[15px] rounded-pill",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
  const classes = `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} inline-flex items-center justify-center gap-2 font-medium tracking-tight whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-blue ${className}`;
  return <button ref={ref} className={classes} {...props} />;
});
