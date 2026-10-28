"use client";

import { useRef, type CSSProperties, type KeyboardEvent } from "react";

export type SegmentOption<T extends string> = { value: T; label: string };

/** Segmented picker whose highlight slides to the chosen option; arrow keys move the choice. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex(option => option.value === value));

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (at + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div className="internal-seg" role="radiogroup" aria-label={label}
      style={{ "--n": options.length, "--idx": index } as CSSProperties}>
      <span className="internal-seg__thumb" aria-hidden="true" />
      {options.map((option, at) => (
        <button key={option.value} ref={node => { refs.current[at] = node; }} type="button" role="radio"
          aria-checked={option.value === value} tabIndex={option.value === value ? 0 : -1}
          className="internal-seg__item" onClick={() => onChange(option.value)} onKeyDown={event => onKeyDown(event, at)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
