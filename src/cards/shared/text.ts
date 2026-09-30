/** Label text without `backtick` code markers, for aria-labels and review descriptions. */
export function plainText(label: string): string {
  return label.replace(/`([^`]+)`/g, "$1");
}
