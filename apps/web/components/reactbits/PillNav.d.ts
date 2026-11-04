// Types for the JavaScript component next to this file (React Bits, see its header).
import type { CSSProperties, ElementType, JSX, MouseEvent, ReactNode } from "react";

export type PillNavItem = { label: string; href?: string; icon?: ReactNode; ariaLabel?: string };

export type PillNavProps = {
  items?: PillNavItem[];
  logo?: string | ReactNode;
  logoAlt?: string;
  logoHref?: string;
  activeHref?: string;
  defaultActiveIndex?: number;
  onItemClick?: (item: PillNavItem, index: number, event: MouseEvent) => void;
  linkComponent?: ElementType;
  /** Vibers Club: "winewood" is the club palette */
  theme?: "dark" | "light" | "winewood";
  layout?: "split" | "joined";
  itemStyle?: "pill" | "plain";
  hoverEffect?: "fill" | "glide" | "none";
  indicator?: "dot" | "pill" | "none";
  surface?: "glass" | "solid" | "none";
  size?: "sm" | "md" | "lg";
  highlightColor?: string;
  highlightTextColor?: string;
  barColor?: string;
  textColor?: string;
  bounce?: number;
  stretch?: number;
  collapse?: "auto" | "always" | "never";
  onMenuToggle?: (open: boolean) => void;
  intro?: boolean;
  ariaLabel?: string;
  /** Vibers Club: "bottom" opens the folded menu upward */
  placement?: "top" | "bottom";
  className?: string;
  style?: CSSProperties;
};
export default function PillNav(props: PillNavProps): JSX.Element;
