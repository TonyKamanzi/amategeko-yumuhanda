/** Root font sizes for each text-size step, shared by the pre-paint script
 *  and the React hook so the button works even if CSS delivery is delayed. */
export const TEXT_SIZE_STYLES = {
  normal: "",
  large: "125%",
  xlarge: "150%",
} as const;

export type TextSize = keyof typeof TEXT_SIZE_STYLES;

export function isTextSize(value: string | null): value is TextSize {
  return value !== null && Object.prototype.hasOwnProperty.call(TEXT_SIZE_STYLES, value);
}
