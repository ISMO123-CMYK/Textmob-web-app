export function isValidName(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[A-Za-z\s]+$/.test(trimmed) && /[aeiou]/i.test(trimmed);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value) {
  return /^\+?[\d\s-]{10,}$/.test(value);
}

export function isStrongPassword(value) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[!@#$%^&*]/.test(value)
  );
}

export function isValidUsername(value) {
  return /^[a-z0-9]+$/.test(value.toLowerCase()) && value.length > 0;
}
