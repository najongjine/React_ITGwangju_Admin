import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant}`} type={type} {...props}>
      {children}
    </button>
  );
}
