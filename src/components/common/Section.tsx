import type { ReactNode } from "react";

type SectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Section({ title, description, actions, children }: SectionProps) {
  return (
    <section className="section">
      {(title || description || actions) && (
        <div className="section__header">
          <div>
            {title && <h2 className="section__title">{title}</h2>}
            {description && <p className="section__description">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
