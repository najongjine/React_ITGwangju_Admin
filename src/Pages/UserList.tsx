import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Page,
  Section,
  TextInput,
} from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import { getAdminUsers, type AuthUser } from "../services/authApi";

function getUserName(user: AuthUser) {
  return user.realName || user.name || user.username || user.email || `회원 ${user.id}`;
}

function getStatusColor(status?: string | null): "gray" | "green" | "red" {
  if (status === "active") {
    return "green";
  }

  if (status === "inactive" || status === "blocked" || status === "deleted") {
    return "red";
  }

  return "gray";
}

function getStatusLabel(status?: string | null) {
  if (status === "active") return "정상";
  if (status === "inactive") return "비활성";
  if (status === "blocked") return "차단";
  if (status === "deleted") return "삭제";
  return status || "미확인";
}

function matchesKeyword(user: AuthUser, keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;

  return [
    String(user.id),
    user.realName,
    user.name,
    user.username,
    user.email,
    user.phone,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export default function UserList() {
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canUsePage = isAuthenticated && user?.role === "admin";
  const activeCount = useMemo(
    () => users.filter((item) => item.status === "active").length,
    [users]
  );

  const loadUsers = async (q = keyword) => {
    setLoading(true);
    setError("");

    try {
      const keyword = q.trim();
      const remoteUsers = await getAdminUsers(token, keyword);

      if (keyword && remoteUsers.length === 0) {
        const fallbackUsers = await getAdminUsers(token, "");
        setUsers(fallbackUsers.filter((item) => matchesKeyword(item, keyword)));
        return;
      }

      setUsers(remoteUsers.filter((item) => matchesKeyword(item, keyword)));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "회원 목록을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canUsePage) {
      void loadUsers("");
    }
  }, [canUsePage]);

  if (!isAuthenticated) {
    return (
      <Page title="회원관리" description="관리자 로그인이 필요한 메뉴입니다.">
        <Section>
          <EmptyState title="로그인 후 이용해 주세요." />
        </Section>
      </Page>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Page title="회원관리" description="관리자 권한이 있는 계정만 접근할 수 있습니다.">
        <Section>
          <EmptyState title="관리자 권한이 필요합니다." />
        </Section>
      </Page>
    );
  }

  return (
    <Page
      title="회원관리"
      description={`조회된 회원 ${users.length}명 중 정상 회원은 ${activeCount}명입니다.`}
    >
      <Section
        title="회원목록"
        actions={
          <form
            className="course-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              void loadUsers();
            }}
          >
            <TextInput
              label="검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="이름, 이메일, 전화번호, 회원번호"
            />
            <Button type="submit" variant="secondary" disabled={loading}>
              {loading ? "검색 중" : "검색"}
            </Button>
          </form>
        }
      >
        {error && <p className="form-message form-message--error">{error}</p>}
        {loading ? (
          <EmptyState title="회원 목록을 불러오는 중입니다." />
        ) : users.length === 0 ? (
          <EmptyState
            title="조회된 회원이 없습니다."
            description="검색어를 바꾸거나 비워서 다시 조회해 주세요."
          />
        ) : (
          <DataTable
            rows={users}
            getRowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/users/${row.id}`)}
            columns={[
              {
                key: "id",
                header: "회원번호",
                render: (row) => row.id,
              },
              {
                key: "name",
                header: "이름",
                render: (row) => (
                  <Link className="table-link" to={`/users/${row.id}`}>
                    {getUserName(row)}
                  </Link>
                ),
              },
              {
                key: "email",
                header: "이메일",
                render: (row) => row.email || <span className="muted">-</span>,
              },
              {
                key: "phone",
                header: "전화번호",
                render: (row) => row.phone || <span className="muted">-</span>,
              },
              {
                key: "status",
                header: "상태",
                render: (row) => (
                  <Badge color={getStatusColor(row.status)}>
                    {getStatusLabel(row.status)}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "관리",
                render: (row) => (
                  <Link to={`/users/${row.id}`}>
                    <Button variant="secondary">상세</Button>
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Section>
    </Page>
  );
}
