type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: boolean };

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const append = (input: ClassValue) => {
    if (!input) return;
    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
      return;
    }
    if (Array.isArray(input)) {
      input.forEach(append);
      return;
    }
    if (typeof input === "object") {
      Object.entries(input).forEach(([key, value]) => {
        if (value) classes.push(key);
      });
    }
  };

  inputs.forEach(append);
  return classes.join(" ");
}
