import StatusChip from "@/shared/components/ui/StatusChip";
import type { StatusTone } from "@/shared/components/ui/StatusChip";
import Button from "@/shared/components/ui/Button";
import IconButton from "@/shared/components/ui/IconButton";
import styles from "./IntegrationCard.module.scss";

type Props = {
  title: string;
  description: string;
  status: { label: string; tone: StatusTone };
  saved?: boolean;
};

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        fill={filled ? "currentColor" : "none"}
        opacity={filled ? 0.9 : 1}
      />
    </svg>
  );
}

function ReadMoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 7l2 2-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function IntegrationCard({ title, description, status, saved }: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.icon}>⦿</div>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>

      <div className={styles.meta}>
        <StatusChip label={status.label} tone={status.tone} />
      </div>

      <div className={styles.actions}>
        <Button variant="soft" leftIcon={<ReadMoreIcon />}>
          Read more
        </Button>
        <IconButton icon={<BookmarkIcon filled={saved} />} aria-label="Save" />
      </div>
    </article>
  );
}