/** Amount is the only disable reason. Mandate state never gates withdraw. */
export function withdrawDisabled(amount: number, _state: string) {
  return amount <= 0;
}
