import styles from "./IconButton.module.scss";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
};

export default function IconButton({ icon, ...props }: Props) {
  return (
    <button className={styles.iconBtn} {...props}>
      {icon}
    </button>
  );
}