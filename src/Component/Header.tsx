import React from "react";
import { NavLink } from "react-router-dom";
import "./Header.css";

const menuItems = [
  { path: "/", label: "대시보드" },
  { path: "/courses", label: "과정 관리" },
  { path: "/components", label: "컴포넌트" },
  { path: "/login", label: "로그인" },
  { path: "/contextapi_test", label: "Context" },
];

const Header: React.FC = () => {
  const envInfo = {
    mode: import.meta.env.MODE,
    authUrl: import.meta.env.VITE_AUTH_VALIDATE_URL ?? "not set",
  };

  return (
    <header className="header">
      <div className="header-main">
        <NavLink to="/" className="header-logo">
          ITLOC
        </NavLink>

        <nav className="header-nav" aria-label="주요 메뉴">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "header-menu active" : "header-menu"
              }
              end={item.path === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-env" title={envInfo.authUrl}>
          <span>ENV</span>
          <strong>{envInfo.mode}</strong>
          <code>{envInfo.authUrl}</code>
        </div>
      </div>
    </header>
  );
};

export default Header;
