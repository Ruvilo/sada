import type { SADAIconName } from "./icons";
import { SADAIcons } from "./icons";

type IconVariant = "nav" | "action" | "chip";

const VARIANT_SIZE: Record<IconVariant, number> = {
  nav: 20,
  action: 18,
  chip: 16,
};

type AppIconProps = {
  name: SADAIconName;
  variant?: IconVariant;
  className?: string;
  title?: string;
};

export function AppIcon({ name, variant = "action", className, title }: AppIconProps) {
  const IconComponent = SADAIcons[name];
  const size = VARIANT_SIZE[variant];

  return (
    <span className={className} title={title} aria-hidden={title ? undefined : true}>
      <IconComponent size={size} />
    </span>
  );
}