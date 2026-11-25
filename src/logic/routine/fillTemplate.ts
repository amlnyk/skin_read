/**
 * Puts values into a template text: "{products}" becomes the names the caller gives.
 * The text comes from the content, the values from the screen (names are not the logic's
 * business). A placeholder with no value stays as it is, so a typo in a template is seen at once
 * and never hidden as an empty gap.
 */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(
    /\{([A-Za-z][A-Za-z0-9]*)\}/g,
    (whole, key: string) => values[key] ?? whole,
  );
}
