import { Search } from "lucide-react";
import React from "react";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export function SearchInput({ wrapperClassName = "", style, ...props }: SearchInputProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        className="input-field"
        // Left padding is set inline (not via the `pl-9` Tailwind class) because
        // the shared `.input-field` rule in index.css sets a `padding` shorthand
        // that loads after Tailwind's utilities and silently wins the cascade
        // at equal specificity, collapsing the left padding back down and
        // causing the search icon to overlap the placeholder/typed text.
        style={{ paddingLeft: "34px", ...style }}
        {...props}
      />
    </div>
  );
}
