import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Page, Section, TextInput } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import { loginUser, registerUser } from "../services/authApi";

type LoginProps = {
  initialMode?: "login" | "signup";
};

type LoginForm = {
  identifier: string;
  password: string;
};

type SignupForm = {
  email: string;
  realName: string;
  username: string;
  password: string;
  phone: string;
};

const emptyLoginForm: LoginForm = {
  identifier: "",
  password: "",
};

const emptySignupForm: SignupForm = {
  email: "",
  realName: "",
  username: "",
  password: "",
  phone: "",
};

export default function Login({ initialMode = "login" }: LoginProps) {
  const navigate = useNavigate();
  const { isAuthenticated, setSession } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [loginForm, setLoginForm] = useState<LoginForm>(emptyLoginForm);
  const [signupForm, setSignupForm] = useState<SignupForm>(emptySignupForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setMessage("");
  }, [initialMode]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const updateLoginForm = (name: keyof LoginForm, value: string) => {
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateSignupForm = (name: keyof SignupForm, value: string) => {
    setSignupForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!loginForm.identifier.trim() || !loginForm.password) {
      setMessage("아이디 또는 이메일과 비밀번호를 입력하세요.");
      return;
    }

    setSubmitting(true);

    try {
      const session = await loginUser({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      setSession(session.token, session.user);
      navigate("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (
      !signupForm.email.trim() ||
      !signupForm.realName.trim() ||
      !signupForm.username.trim() ||
      !signupForm.password ||
      !signupForm.phone.trim()
    ) {
      setMessage("회원가입 정보를 모두 입력하세요.");
      return;
    }

    if (signupForm.password.length < 8) {
      setMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);

    try {
      const session = await registerUser({
        email: signupForm.email.trim(),
        realName: signupForm.realName.trim(),
        username: signupForm.username.trim(),
        password: signupForm.password,
        phone: signupForm.phone.trim(),
      });
      setSession(session.token, session.user);
      navigate("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회원가입하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page
      title={mode === "login" ? "로그인" : "회원가입"}
      description="자체 계정으로 관리자 페이지에 접속합니다."
    >
      <Section>
        <div className="auth-layout">
          <Card
            title={mode === "login" ? "로그인" : "새 계정 만들기"}
            description={
              mode === "login"
                ? "아이디 또는 이메일로 로그인하세요."
                : "회원 정보를 입력하면 바로 로그인됩니다."
            }
          >
            {message && <p className="form-message form-message--error">{message}</p>}

            {mode === "login" ? (
              <form className="auth-form" onSubmit={(event) => void handleLogin(event)}>
                <TextInput
                  label="아이디 또는 이메일"
                  value={loginForm.identifier}
                  onChange={(event) => updateLoginForm("identifier", event.target.value)}
                  autoComplete="username"
                  required
                />
                <TextInput
                  label="비밀번호"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => updateLoginForm("password", event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <div className="course-form__actions">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "로그인 중" : "로그인"}
                  </Button>
                  <Link to="/signup">
                    <Button variant="secondary">회원가입</Button>
                  </Link>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={(event) => void handleSignup(event)}>
                <TextInput
                  label="이메일"
                  type="email"
                  value={signupForm.email}
                  onChange={(event) => updateSignupForm("email", event.target.value)}
                  autoComplete="email"
                  required
                />
                <TextInput
                  label="이름"
                  value={signupForm.realName}
                  onChange={(event) => updateSignupForm("realName", event.target.value)}
                  autoComplete="name"
                  required
                />
                <TextInput
                  label="아이디"
                  value={signupForm.username}
                  onChange={(event) => updateSignupForm("username", event.target.value)}
                  autoComplete="username"
                  required
                />
                <TextInput
                  label="비밀번호"
                  type="password"
                  value={signupForm.password}
                  onChange={(event) => updateSignupForm("password", event.target.value)}
                  autoComplete="new-password"
                  helpText="8자 이상 입력하세요."
                  required
                />
                <TextInput
                  label="전화번호"
                  value={signupForm.phone}
                  onChange={(event) => updateSignupForm("phone", event.target.value)}
                  autoComplete="tel"
                  required
                />
                <div className="course-form__actions">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "가입 중" : "회원가입"}
                  </Button>
                  <Link to="/login">
                    <Button variant="secondary">로그인</Button>
                  </Link>
                </div>
              </form>
            )}
          </Card>
        </div>
      </Section>
    </Page>
  );
}
