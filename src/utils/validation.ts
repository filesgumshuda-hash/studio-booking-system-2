export interface ValidationError {
  field: string;
  message: string;
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
}

export function validateEmail(email: string): boolean {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequired(value: string | undefined, fieldName: string): ValidationError | null {
  if (!value || value.trim() === '') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationError | null {
  if (value.length < minLength) {
    return { field: fieldName, message: `${fieldName} must be at least ${minLength} characters` };
  }
  return null;
}

export function validatePositiveNumber(value: number, fieldName: string): ValidationError | null {
  if (value < 0) {
    return { field: fieldName, message: `${fieldName} must be a positive number` };
  }
  return null;
}

export function validateFutureDate(date: string, fieldName: string): ValidationError | null {
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return { field: fieldName, message: `${fieldName} cannot be in the past` };
  }
  return null;
}
