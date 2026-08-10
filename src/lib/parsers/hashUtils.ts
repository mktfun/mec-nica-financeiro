export const generateDeterministicHash = (date: string, amount: number, memo: string, prefix: string): string => {
  // Remove non-alphanumeric characters and lowercase to prevent false negatives
  const safeMemo = (memo || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  // Ensure consistent decimal representation, ignore floating point small diffs
  const safeAmount = Math.abs(amount).toFixed(2);
  // Ensure date is consistent (assuming YYYY-MM-DD or DD/MM/YYYY, but just remove non-alphanumeric to be safe)
  const safeDate = (date || '').replace(/[^0-9]/g, '');
  
  return `${prefix}_${safeDate}_${safeAmount}_${safeMemo}`;
};
