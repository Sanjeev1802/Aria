"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Check, FileText, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

declare global {
  interface Window {
    TdevBeam?: { mount: (el: HTMLElement) => void };
  }
}

type Props = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  model: string;
  onModelChange: (model: string) => void;
  file: File | null;
  onClearFile: () => void;
  fileError: string;
  uploadRef: RefObject<HTMLInputElement | null>;
  onFileChosen: (file: File | null) => void;
};

function autosize(ta: HTMLTextAreaElement) {
  ta.style.height = "auto";
  ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
}

export function TdevHeroComposer({
  prompt,
  onPromptChange,
  onSubmit,
  inputRef,
  model,
  onModelChange,
  file,
  onClearFile,
  fileError,
  uploadRef,
  onFileChosen,
}: Props) {
  const beamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = beamRef.current;
    if (!el) return;

    let cancelled = false;

    async function mountBeam() {
      if (!window.TdevBeam) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[data-tdev-beam="1"]');
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            if (window.TdevBeam) resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "/vendor/beam.js";
          script.async = true;
          script.dataset.tdevBeam = "1";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("beam.js failed to load"));
          document.body.appendChild(script);
        });
      }
      const target = beamRef.current;
      if (!cancelled && target && window.TdevBeam) window.TdevBeam.mount(target);
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      mountBeam().catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ta = inputRef.current;
    if (ta) autosize(ta);
  }, [prompt, inputRef]);

  const statusText =
    fileError || (file ? "File selected for preview only. Nothing has been uploaded." : "");

  return (
    <div className="hero-composer-anchor">
      <div className="cm-beam" id="cm-beam" ref={beamRef}>
        <form
          className="cm-composer"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="sr-only" htmlFor="prompt">
            Ask ARIA anything
          </label>
          {file && (
            <div className="aria-file-row">
              <div className="aria-file-chip">
                <FileText size={13} aria-hidden />
                <span>{file.name}</span>
                <button type="button" onClick={onClearFile} aria-label="Remove attachment">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
          <textarea
            id="prompt"
            ref={inputRef}
            rows={1}
            maxLength={4000}
            value={prompt}
            placeholder="Describe your question or task"
            onChange={(e) => {
              onPromptChange(e.target.value);
              autosize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,.txt,.csv"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose an attachment"
            onChange={(e) => {
              const chosen = e.target.files?.[0] ?? null;
              e.target.value = "";
              onFileChosen(chosen);
            }}
          />
          <div className="cm-composer-row">
            <button
              type="button"
              className="cm-round cm-plus"
              aria-label="Attach a file"
              onClick={() => uploadRef.current?.click()}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <span className="cm-grow" aria-hidden="true" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="cm-agent" aria-haspopup="menu">
                  <span className="cm-agent-label">Agent</span>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M4.46967 6.46967C4.76256 6.17678 5.23744 6.17678 5.53033 6.46967L8 8.93934L10.4697 6.46967C10.7626 6.17678 11.2374 6.17678 11.5303 6.46967C11.8232 6.76256 11.8232 7.23744 11.5303 7.53033L8.53033 10.5303C8.23744 10.8232 7.76256 10.8232 7.46967 10.5303L4.46967 7.53033C4.17678 7.23744 4.17678 6.76256 4.46967 6.46967Z"
                    />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="model-dropdown cm-agent-menu">
                <p className="cm-agent-menu-kicker">Model</p>
                {["Auto", "Claude", "Amazon Nova"].map((name) => (
                  <DropdownMenuItem key={name} onSelect={() => onModelChange(name)}>
                    {name}
                    <span className="dropdown-check">{model === name && <Check size={14} />}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="submit"
              className="cm-round cm-send"
              disabled={!prompt.trim()}
              aria-label="Send prompt"
            >
              <svg className="cm-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M7.99967 12.6667V3.33337M12.6663 8.00004L7.99967 3.33337L3.33301 8.00004"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
      {statusText ? (
        <p className="cm-composer-meta" role="status">
          {statusText}
        </p>
      ) : null}
    </div>
  );
}
