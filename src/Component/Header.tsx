import React from "react";
import { NavLink } from "react-router-dom";
import { Button } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import "./Header.css";

const menuItems = [
  { path: "/", label: "대시보드" },
  { path: "/courses", label: "과정 관리" },
  { path: "/users/password-reset", label: "비밀번호 변경" },
];

menuItems.splice(
  2,
  0,
  { path: "/notices", label: "공지사항 관리" },
  { path: "/inquiries", label: "문의사항 관리" },
);

const Header: React.FC = () => {
  const { clearToken, isAuthenticated, status, user } = useAuth();

  const getCourseApiBaseUrl = () => {
    const courseApiBaseUrl = import.meta.env.VITE_COURSE_API_BASE_URL;

    if (courseApiBaseUrl) {
      return courseApiBaseUrl;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (apiBaseUrl) {
      return `${apiBaseUrl.replace(/\/$/, "")}/api/courses`;
    }

    const authUrl = import.meta.env.VITE_AUTH_VALIDATE_URL;

    if (authUrl) {
      try {
        return `${new URL(authUrl).origin}/api/courses`;
      } catch {
        return `${authUrl.replace(/\/$/, "")}/api/courses`;
      }
    }

    return "/api/courses";
  };

  const envInfo = {
    mode: import.meta.env.MODE,
    authUrl: import.meta.env.VITE_AUTH_VALIDATE_URL ?? "not set",
    courseApiUrl: getCourseApiBaseUrl(),
  };

  return (
    <header className="header">
      <div className="header-main">
        <div className="header-top">
          <NavLink to="/" className="header-logo">
            광주컴퓨터기술학원 관리자 페이지
          </NavLink>

          <div className="header-right">
            {isAuthenticated ? (
              <div className="header-user">
                <span className="header-user__name">
                  {user?.realName || user?.name || user?.username || "회원"}
                </span>
                <span className="header-user__meta">
                  {user?.email || user?.role || "로그인됨"}
                </span>
                <Button variant="secondary" onClick={clearToken}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <div className="header-auth">
                <NavLink to="/login" className="header-menu">
                  로그인
                </NavLink>
                <NavLink to="/signup" className="header-menu">
                  회원가입
                </NavLink>
              </div>
            )}

            <div
              className="header-env"
              title={`AUTH: ${envInfo.authUrl}\nCOURSE: ${envInfo.courseApiUrl}`}
            >
              <span>ENV</span>
              <strong>{envInfo.mode}</strong>
              <code>
                {status === "checking"
                  ? "auth checking..."
                  : envInfo.courseApiUrl}
              </code>
            </div>
          </div>
        </div>

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
      </div>
    </header>
  );
};

export default Header;
