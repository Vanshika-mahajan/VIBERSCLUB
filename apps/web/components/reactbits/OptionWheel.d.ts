// Types for the JavaScript component next to this file (React Bits, see its header).
import type { JSX } from "react";

export type OptionWheelProps = {
  items?: string[];
  defaultSelected?: number;
  onChange?: (index: number, item: string) => void;
  textColor?: string;
  activeColor?: string;
  side?: "left" | "right";
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  className?: string;
  /** Vibers Club: controlled selection */
  selected?: number;
  /** Vibers Club: accessible name of the listbox */
  ariaLabel?: string;
  id?: string;
};
export default function OptionWheel(props: OptionWheelProps): JSX.Element;
