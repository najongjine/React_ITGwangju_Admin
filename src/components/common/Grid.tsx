import type { ReactNode } from "react";

type GridProps = {
  columns?: 2 | 3 | 4;
  children: ReactNode;
};

export default function Grid({ columns = 3, children }: GridProps) {
  return <div className={`grid grid--${columns}`}>{children}</div>;
}
