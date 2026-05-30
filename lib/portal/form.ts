export function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalString(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value.length > 0 ? value : null;
}

export function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(stringValue(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function requireString(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}
