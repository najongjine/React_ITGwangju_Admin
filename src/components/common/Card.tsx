import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export default function Card({ title, description, children }: CardProps) {
  return (
    <article className="card">
      {title && <h3 className="card__title">{title}</h3>}
      {description && <p className="card__description">{description}</p>}
      {children && <div className="card__content">{children}</div>}
    </article>
  );
}
