import { useAppStore } from "../lib/store";

export function useFactChecks() {
  const factChecks = useAppStore((s) => s.factChecks);
  const addFactCheck = useAppStore((s) => s.addFactCheck);
  return { factChecks, addFactCheck };
}
