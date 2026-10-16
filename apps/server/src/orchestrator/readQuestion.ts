export function readQuestion(output: Record<string, unknown> | undefined): string | undefined {
  const question = output?.question;
  return typeof question === "string" && question.trim() !== "" ? question : undefined;
}
