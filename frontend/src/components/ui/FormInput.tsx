import React from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, ...props }: FormInputProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      <input className="input-field" {...props} />
    </div>
  );
}
