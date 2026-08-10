// Deliberately not a templating engine — just `{{key}}` substitution against
// a flat placeholder map, since correspondence templates only ever need
// member fields. Unknown placeholders are left verbatim rather than blanked,
// so a typo'd `{{firstname}}` is obviously wrong in the rendered preview
// instead of silently disappearing.
export function renderTemplate(source: string, placeholders: Record<string, string>): string {
  return source.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(placeholders, key) ? placeholders[key] : match,
  );
}
