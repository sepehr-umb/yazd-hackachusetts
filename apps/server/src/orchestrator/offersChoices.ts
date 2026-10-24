export function offersChoices(output: unknown): boolean {
  if (typeof output !== "object" || output === null) return false;
  const { applied, closest } = output as Record<string, unknown>;
  return applied === false && Array.isArray(closest) && closest.length > 0;
}
