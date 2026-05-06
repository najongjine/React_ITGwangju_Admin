import type { ReactNode } from "react";
import "./common.css";

type PageProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Page({ title, description, actions, children }: PageProps) {
  return (
    <main className="page">
      <div className="page__inner">
        <div className="page__header">
          <div>
            <h1 className="page__title">{title}</h1>
            {description && <p className="page__description">{description}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </main>
  );
}
