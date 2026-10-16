type PropertySchema = { type?: string; enum?: unknown[]; minimum?: number; maximum?: number };

function withinRange(property: PropertySchema, value: unknown): boolean {
  if (typeof value !== "number") return true;
  const aboveMinimum = property.minimum === undefined || value >= property.minimum;
  const belowMaximum = property.maximum === undefined || value <= property.maximum;
  return aboveMinimum && belowMaximum;
}

function matchesProperty(property: PropertySchema, value: unknown): boolean {
  const typeMatches = property.type === undefined || typeof value === property.type;
  const enumMatches = property.enum === undefined || property.enum.includes(value);
  return typeMatches && enumMatches && withinRange(property, value);
}

export function validateToolInput(
  schema: Record<string, unknown>,
  input: Record<string, unknown>,
): boolean {
  const required = (schema.required as string[] | undefined) ?? [];
  const properties = (schema.properties as Record<string, PropertySchema> | undefined) ?? {};
  return (
    required.every((key) => key in input) &&
    Object.entries(properties).every(
      ([key, property]) => !(key in input) || matchesProperty(property, input[key]),
    )
  );
}
