import styles from "./StatusChip.module.scss";

export type StatusTone = "success" | "warning" | "danger" | "info";

export type StatusChipProps = {
  label: string;
  tone: StatusTone;
};

export default function StatusChip({ label, tone }: StatusChipProps) {
  return (
    <span className={`${styles.chip} ${styles[tone]}`}>
      <span className={styles.icon} aria-hidden />
      {label}
    </span>
  );
}