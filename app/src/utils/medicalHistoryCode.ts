import { ApiMedicalHistoryEntry } from '../services/api';

export const getMedicalHistoryCode = (
  entry: Pick<ApiMedicalHistoryEntry, 'id' | 'entry_code' | 'history_code'> | null | undefined
): string => {
  if (!entry) {
    return '';
  }
  if (entry.history_code?.trim()) {
    return entry.history_code;
  }
  if (entry.entry_code?.trim()) {
    return entry.entry_code;
  }
  return `MH-${entry.id}`;
};

