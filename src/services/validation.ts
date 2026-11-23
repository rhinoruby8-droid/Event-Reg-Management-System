import { Delegate, EditableDelegateField } from '../types';

export type RowValidationErrors = Partial<Record<EditableDelegateField, string>>;
export type ValidationMap = Record<string, RowValidationErrors>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validates every delegate in the dataset.
 * Email uniqueness is strictly enforced across the ENTIRE event (all partners).
 */
export function validateAllDelegates(allDelegates: Delegate[]): ValidationMap {
  const emailCounts = new Map<string, number>();

  for (const d of allDelegates) {
    const normalized = d.email.trim().toLowerCase();
    if (normalized) {
      emailCounts.set(normalized, (emailCounts.get(normalized) ?? 0) + 1);
    }
  }

  const map: ValidationMap = {};

  for (const d of allDelegates) {
    const errors: RowValidationErrors = {};

    if (!d.firstName.trim()) {
      errors.firstName = 'First Name is required';
    }
    if (!d.lastName.trim()) {
      errors.lastName = 'Last Name is required';
    }
    if (!d.company.trim()) {
      errors.company = 'Company is required';
    }
    if (!d.country.trim()) {
      errors.country = 'Country is required';
    }

    const emailTrimmed = d.email.trim();
    if (!emailTrimmed) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(emailTrimmed)) {
      errors.email = 'Invalid email format';
    } else if ((emailCounts.get(emailTrimmed.toLowerCase()) ?? 0) > 1) {
      errors.email = 'Duplicate email — must be unique across PCE AUS 2026';
    }

    if (!d.experienceLevel) {
      errors.experienceLevel = 'Experience Level is required';
    }

    if (d.hasDietary && !d.dietaryDetails.trim()) {
      errors.dietaryDetails = 'Dietary details are required when Dietary is Yes';
    }

    map[d.id] = errors;
  }

  return map;
}

/**
 * Validates a batch of preview rows (e.g. from Paste or Excel Upload)
 * against both existing event delegates and duplicates within the incoming batch.
 */
export function validateCandidateDelegates(
  candidates: Delegate[],
  existingDelegates: Delegate[]
): ValidationMap {
  const combined = [...existingDelegates, ...candidates];
  const fullMap = validateAllDelegates(combined);
  const candidateMap: ValidationMap = {};
  for (const c of candidates) {
    candidateMap[c.id] = fullMap[c.id] || {};
  }
  return candidateMap;
}

export function getRowErrorCount(errors?: RowValidationErrors): number {
  if (!errors) return 0;
  return Object.keys(errors).length;
}

export function hasAnyErrors(errors?: RowValidationErrors): boolean {
  return getRowErrorCount(errors) > 0;
}
