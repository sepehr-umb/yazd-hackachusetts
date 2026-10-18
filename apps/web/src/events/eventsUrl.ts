export function eventsUrl({ protocol, host }: { protocol: string; host: string }): string {
  const scheme = protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${host}/events`;
}
