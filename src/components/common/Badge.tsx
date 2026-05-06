type BadgeProps = {
  children: string;
  color?: "gray" | "green" | "blue" | "red";
};

export default function Badge({ children, color = "gray" }: BadgeProps) {
  return <span className={`badge badge--${color}`}>{children}</span>;
}
