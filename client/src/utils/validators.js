export function isValidName(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[A-Za-z\s]+$/.test(trimmed) && /[aeiou]/i.test(trimmed);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizePhone(value) {
  if (!value) return '';
  let cleaned = value.replace(/[\s\-\(\)]+/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export function isValidPhone(value) {
  const normalized = normalizePhone(value);
  return /^\+\d{7,15}$/.test(normalized);
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
  return /^[a-z0-9_]{3,30}$/.test(value.toLowerCase());
}
