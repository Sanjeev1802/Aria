"use client";

import { createContext, useContext, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import type { AriaProject } from "./aria-projects-storage";

type ProjectContextValue = {
  activeProjectId: string | null;
  setActiveProjectId: Dispatch<SetStateAction<string | null>>;
  activeProjectRef: RefObject<string | null>;
  projects: AriaProject[];
  setProjects: Dispatch<SetStateAction<AriaProject[]>>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function AriaProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<AriaProject[]>([]);
  const activeProjectRef = useRef(activeProjectId);
  activeProjectRef.current = activeProjectId;
  return <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId, activeProjectRef, projects, setProjects }}>
    {children}
  </ProjectContext.Provider>;
}

export function useAriaProjects() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("ARIA projects require AriaProjectProvider");
  return value;
}
