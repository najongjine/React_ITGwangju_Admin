import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import {
  adminResetPassword,
  getAdminUsers,
  type AuthUser,
} from "../services/authApi";

type ResetForm = {
  identifier: string;
  newPassword: string;
};

const emptyForm: ResetForm = {
  identifier: "",
  newPassword: "",
};

function getUserLabel(user: AuthUser) {
  return user.realName || user.name || user.username || user.email || `#${user.id}`;
}

function getStatusColor(status?: string | null): "gray" | "green" | "red" {
  if (status === "active") {
    return "green";
  }
  if (status === "deleted" || status === "blocked" || status === "inactive") {
    return "red";
  }
  return "gray";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserPasswordReset() {
  const { isAuthenticated, token, user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<ResetForm>(emptyForm);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canUsePage = isAuthenticated && user?.role === "admin";
  const selectedLabel = useMemo(
    () => (selectedUser ? getUserLabel(selectedUser) : ""),
    [selectedUser]
  );

  const updateForm = (name: keyof ResetForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const loadUsers = async (q = searchKeyword) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      setUsers(await getAdminUsers(token, q));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "계정 목록을 불러오지 못했습니다."
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

  const selectUser = (nextUser: AuthUser) => {
    setSelectedUser(nextUser);
    setMessage("");
    setError("");
    setForm((prev) => ({
      ...prev,
      identifier: nextUser.username || nextUser.email || String(nextUser.id),
    }));
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const identifier = form.identifier.trim();
    if (!selectedUser && !identifier) {
      setError("계정 ID, 로그인 아이디, 이메일 중 하나를 입력해 주세요.");
      return;
    }

    if (form.newPassword && form.newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    const confirmed = window.confirm(
      `${selectedLabel || identifier} 계정의 비밀번호를 변경할까요?`
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await adminResetPassword(token, {
        userId: selectedUser?.id,
        identifier,
        newPassword: form.newPassword,
      });
      const nextMessage = result.temporaryPassword
        ? `임시 비밀번호가 발급되었습니다.\n${result.temporaryPassword}`
        : "입력한 새 비밀번호로 변경되었습니다.";

      setMessage(nextMessage);
      setForm((prev) => ({
        ...prev,
        newPassword: "",
      }));
      await loadUsers(searchKeyword);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "비밀번호를 변경하지 못했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Page
        title="계정 비밀번호 변경"
        description="관리자 로그인이 필요한 기능입니다."
      >
        <Section>
          <EmptyState title="로그인 후 이용해 주세요." />
        </Section>
      </Page>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Page
        title="계정 비밀번호 변경"
        description="관리자 권한이 있는 계정만 비밀번호를 강제로 변경할 수 있습니다."
      >
        <Section>
          <EmptyState title="관리자 권한이 필요합니다." />
        </Section>
      </Page>
    );
  }

  return (
    <Page
      title="계정 비밀번호 변경"
      description="이메일을 못 보거나 이메일이 없는 수강생도 관리자 확인 후 바로 새 비밀번호를 지정할 수 있습니다."
    >
      <Section
        title="계정 찾기"
        description="사용자 ID, 로그인 아이디, 이메일로 검색합니다."
        actions={
          <form
            className="course-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              void loadUsers();
            }}
          >
            <TextInput
              label="검색어"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="예: 12, honggildong, user@example.com"
            />
            <Button type="submit" variant="secondary" disabled={loading}>
              {loading ? "검색 중" : "검색"}
            </Button>
          </form>
        }
      >
        {error && <p className="form-message form-message--error">{error}</p>}
        {message && <p className="form-message form-message--success">{message}</p>}
        {loading ? (
          <EmptyState title="계정 목록을 불러오는 중입니다." />
        ) : users.length === 0 ? (
          <EmptyState
            title="검색된 계정이 없습니다."
            description="사용자 ID나 로그인 아이디를 다시 확인해 주세요."
          />
        ) : (
          <DataTable
            rows={users}
            getRowKey={(row) => row.id}
            columns={[
              {
                key: "id",
                header: "ID",
                render: (row) => row.id,
              },
              {
                key: "name",
                header: "이름",
                render: (row) => getUserLabel(row),
              },
              {
                key: "login",
                header: "로그인 아이디",
                render: (row) => row.username || <span className="muted">-</span>,
              },
              {
                key: "email",
                header: "이메일",
                render: (row) => row.email || <span className="muted">없음</span>,
              },
              {
                key: "status",
                header: "상태",
                render: (row) => (
                  <Badge color={getStatusColor(row.status)}>
                    {row.status || "unknown"}
                  </Badge>
                ),
              },
              {
                key: "lastLoginAt",
                header: "최근 로그인",
                render: (row) => formatDateTime(row.lastLoginAt),
              },
              {
                key: "actions",
                header: "관리",
                render: (row) => (
                  <Button variant="secondary" onClick={() => selectUser(row)}>
                    선택
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Section>

      <Section
        title="비밀번호 강제 변경"
        description="새 비밀번호를 비워두면 서버가 임시 비밀번호를 만들어 화면에 한 번 보여줍니다."
      >
        <form className="password-reset-form" onSubmit={(event) => void handleSubmit(event)}>
          {selectedUser && (
            <div className="selected-user">
              <div>
                <strong>{selectedLabel}</strong>
                <span>
                  #{selectedUser.id}
                  {selectedUser.username ? ` · ${selectedUser.username}` : ""}
                  {selectedUser.email ? ` · ${selectedUser.email}` : ""}
                </span>
              </div>
              <Button variant="secondary" onClick={clearSelection}>
                선택 해제
              </Button>
            </div>
          )}
          <TextInput
            label="계정 ID / 로그인 아이디 / 이메일"
            value={form.identifier}
            onChange={(event) => updateForm("identifier", event.target.value)}
            placeholder="목록에서 선택하거나 직접 입력"
            required={!selectedUser}
          />
          <TextInput
            label="새 비밀번호"
            type="text"
            value={form.newPassword}
            onChange={(event) => updateForm("newPassword", event.target.value)}
            placeholder="비워두면 임시 비밀번호 자동 발급"
            helpText="직접 지정할 경우 8자 이상 입력하세요."
            autoComplete="off"
          />
          <div className="course-form__actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? "변경 중" : "비밀번호 변경"}
            </Button>
            <Button variant="secondary" onClick={clearSelection}>
              초기화
            </Button>
          </div>
        </form>
      </Section>
    </Page>
  );
}
