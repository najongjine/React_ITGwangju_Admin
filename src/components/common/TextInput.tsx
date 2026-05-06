import type { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helpText?: string;
};

export default function TextInput({ label, helpText, id, ...props }: TextInputProps) {
  const inputId = id ?? label.replaceAll(" ", "-").toLowerCase();

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <input className="field__input" id={inputId} {...props} />
      {helpText && <span className="field__help">{helpText}</span>}
    </label>
  );
}
