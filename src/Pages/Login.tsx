import React, { useState } from "react";
import { signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "../Utils/firebase";
import { Button, Card, Page, Section } from "../components/common";

const Login: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <Page title="로그인" description="Firebase Google 로그인을 테스트하는 화면입니다.">
      <Section>
        <Card title="Google 계정">
          {user ? (
            <>
              <p>로그인됨: {user.displayName}</p>
              <p>이메일: {user.email}</p>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="profile"
                  width={80}
                  style={{ borderRadius: "50%" }}
                />
              )}
              <div style={{ marginTop: 16 }}>
                <Button variant="secondary" onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={handleGoogleLogin}>Google 로그인</Button>
          )}
        </Card>
      </Section>
    </Page>
  );
};

export default Login;
