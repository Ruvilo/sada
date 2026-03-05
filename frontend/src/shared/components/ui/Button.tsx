import styles from "./Button.module.scss";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "soft";
  leftIcon?: React.ReactNode;
};

export default function Button({ variant = "soft", leftIcon, ...props }: Props) {
  return (
    <button className={`${styles.btn} ${styles[variant]}`} {...props}>
      {leftIcon ? <span className={styles.leftIcon}>{leftIcon}</span> : null}
      {props.children}
    </button>
  );
}