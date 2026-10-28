"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { AriaProject } from "./aria-projects-storage";

type ProjectContextValue = {
  activeProjectId: string | null;
  setActiveProjectId: Dispatch<SetStateAction<string | null>>;
  /** Stable reader for callbacks that must see the latest project without re-subscribing. */
  getActiveProjectId: () => string | null;
  projects: AriaProject[];
  setProjects: Dispatch<SetStateAction<AriaProject[]>>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function AriaProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<AriaProject[]>([]);
  const activeProjectRef = useRef(activeProjectId);
  useLayoutEffect(() => { activeProjectRef.current = activeProjectId; }, [activeProjectId]);
  const getActiveProjectId = useCallback(() => activeProjectRef.current, []);
  return <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId, getActiveProjectId, projects, setProjects }}>
    {children}
  </ProjectContext.Provider>;
}

export function useAriaProjects() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("ARIA projects require AriaProjectProvider");
  return value;
}
