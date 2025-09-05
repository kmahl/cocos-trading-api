export const toNumberOrZero = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};
