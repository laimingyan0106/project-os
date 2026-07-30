export function detectPromptVariables(content: string) {
  return Array.from(
    new Set(
      Array.from(content.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g))
        .map((match) => match[1]),
    ),
  );
}

export function parsePromptTags(value: string) {
  return Array.from(new Set(
    value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
  )).slice(0, 30);
}
