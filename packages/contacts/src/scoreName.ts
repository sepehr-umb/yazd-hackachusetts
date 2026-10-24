import { similarity } from "./similarity";

export const PARTIAL_NAME_WEIGHT = 0.9;

const tokens = (text: string): string[] => text.split(" ").filter((token) => token !== "");

const average = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const tokenCoverage = (query: string, name: string): number => {
  const queryTokens = tokens(query);
  const nameTokens = tokens(name);
  if (queryTokens.length === 0 || nameTokens.length === 0) return 0;
  return average(
    queryTokens.map((queryToken) =>
      Math.max(...nameTokens.map((nameToken) => similarity(queryToken, nameToken))),
    ),
  );
};

export const scoreName = (normalizedQuery: string, normalizedName: string): number =>
  Math.max(
    similarity(normalizedQuery, normalizedName),
    PARTIAL_NAME_WEIGHT * tokenCoverage(normalizedQuery, normalizedName),
  );
