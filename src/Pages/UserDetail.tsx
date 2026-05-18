import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Page,
  Section,
  TextInput,
} from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import { getCourses, getCourseSessions, type Course, type CourseSession } from "../services/courseApi";
import {
  adminResetUserPassword,
  getAdminUserDetail,
  updateAdminEnrollment,
  updateAdminUser,
  type AdminEnrollment,
  type AdminUserDetail,
  type AuthUser,
} from "../services/authApi";

type UserForm = {
  realName: string;
  username: string;
  email: string;
  phone: string;
  status: string;
};

type EnrollmentForm = {
  courseId: string;
  sessionId: string;
  status: string;
  memo: string;
};

const enrollmentStatuses = [
  { value: "completed", label: "이수" },
  { value: "rejected", label: "탈락" },
  { value: "pending", label: "미선발" },
  { value: "approved", label: "선발" },
];

function getUserName(user?: AuthUser | null) {
  if (!user) return "-";
  return user.realName || user.name || user.username || user.email || `회원 ${user.id}`;
}

function toUserForm(user: AuthUser): UserForm {
  return {
    realName: user.realName || user.name || "",
    username: user.username || "",
    email: user.email || "",
    phone: user.phone || "",
    status: user.status || "active",
  };
}

function getCourseName(enrollment: AdminEnrollment) {
  return (
    enrollment.course?.courseName ||
    enrollment.course?.title ||
    enrollment.course?.name ||
    `과정 ${enrollment.courseId}`
  );
}

function getSessionName(enrollment: AdminEnrollment) {
  const sessionName = enrollment.session?.sessionName;
  const sessionNo = enrollment.session?.sessionNo;

  if (sessionName && sessionNo) return `${sessionName} (${sessionNo}회차)`;
  if (sessionName) return sessionName;
  if (sessionNo) return `${sessionNo}회차`;
  return `회차 ${enrollment.sessionId}`;
}

function getEnrollmentStatusValue(enrollment: AdminEnrollment) {
  const status = (enrollment.approvalStatus || enrollment.applyStatus || "").toLowerCase();
  if (["completed", "complete", "pass"].includes(status)) return "completed";
  if (["rejected", "reject", "failed"].includes(status)) return "rejected";
  if (["approved", "approve"].includes(status)) return "approved";
  return "pending";
}

function getEnrollmentStatusLabel(enrollment: AdminEnrollment) {
  const value = getEnrollmentStatusValue(enrollment);
  return enrollmentStatuses.find((status) => status.value === value)?.label || "미선발";
}

function getEnrollmentStatusColor(status: string): "gray" | "green" | "blue" | "red" {
  if (status === "completed") return "green";
  if (status === "approved") return "blue";
  if (status === "rejected") return "red";
  return "gray";
}

export default function UserDetail() {
  const { id } = useParams();
  const userId = Number(id);
  const { isAuthenticated, token, user: currentUser } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [form, setForm] = useState<UserForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [editingEnrollment, setEditingEnrollment] = useState<AdminEnrollment | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentForm>({
    courseId: "",
    sessionId: "",
    status: "pending",
    memo: "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [enrollmentSaving, setEnrollmentSaving] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState("");

  const canUsePage = isAuthenticated && currentUser?.role === "admin";
  const profile = detail?.profile;
  const address = useMemo(
    () => [profile?.address, profile?.detailAddress].filter(Boolean).join(" ") || "-",
    [profile]
  );

  const loadDetail = async () => {
    const nextDetail = await getAdminUserDetail(token, userId);
    setDetail(nextDetail);
    setForm(toUserForm(nextDetail.user));
  };

  useEffect(() => {
    if (!canUsePage) {
      setLoading(false);
      return;
    }

    if (!Number.isFinite(userId) || userId <= 0) {
      setError("유효한 회원번호가 아닙니다.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        await loadDetail();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "회원 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [canUsePage, userId, token]);

  useEffect(() => {
    const courseId = Number(enrollmentForm.courseId);
    if (!Number.isFinite(courseId) || courseId <= 0) {
      setSessions([]);
      return;
    }

    const loadSessions = async () => {
      try {
        const nextSessions = await getCourseSessions(courseId);
        setSessions(nextSessions);
        setEnrollmentForm((prev) => ({
          ...prev,
          sessionId:
            prev.sessionId && nextSessions.some((session) => String(session.id) === prev.sessionId)
              ? prev.sessionId
              : String(nextSessions[0]?.id ?? ""),
        }));
      } catch {
        setSessions([]);
      }
    };

    void loadSessions();
  }, [enrollmentForm.courseId]);

  const updateForm = (name: keyof UserForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !detail) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const updated = await updateAdminUser(token, detail.user.id, {
        realName: form.realName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
      });
      setDetail((prev) => (prev ? { ...prev, user: updated } : prev));
      setForm(toUserForm(updated));
      setEditing(false);
      setMessage("회원 기본정보를 저장했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "회원 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;

    if (password && password.length < 8) {
      setResetMessage("");
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (!window.confirm(`${getUserName(detail.user)} 회원의 비밀번호를 변경할까요?`)) {
      return;
    }

    setResetting(true);
    setError("");
    setResetMessage("");

    try {
      const result = await adminResetUserPassword(token, detail.user.id, password);
      setPassword("");
      setResetMessage(
        result.temporaryPassword
          ? `임시 비밀번호가 발급되었습니다: ${result.temporaryPassword}`
          : "입력한 비밀번호로 변경했습니다."
      );
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setResetting(false);
    }
  };

  const openEnrollmentModal = async (enrollment: AdminEnrollment) => {
    setEditingEnrollment(enrollment);
    setEnrollmentError("");
    setEnrollmentForm({
      courseId: String(enrollment.courseId),
      sessionId: String(enrollment.sessionId),
      status: getEnrollmentStatusValue(enrollment),
      memo: enrollment.memo || "",
    });

    try {
      setCourses(await getCourses());
    } catch (courseError) {
      setEnrollmentError(
        courseError instanceof Error ? courseError.message : "과정 목록을 불러오지 못했습니다."
      );
    }
  };

  const handleEnrollmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEnrollment) return;

    const courseId = Number(enrollmentForm.courseId);
    const sessionId = Number(enrollmentForm.sessionId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sessionId) || courseId <= 0 || sessionId <= 0) {
      setEnrollmentError("과정과 회차를 선택해 주세요.");
      return;
    }

    setEnrollmentSaving(true);
    setEnrollmentError("");

    try {
      await updateAdminEnrollment(token, editingEnrollment.id, {
        courseId,
        sessionId,
        status: enrollmentForm.status,
        memo: enrollmentForm.memo,
      });
      setEditingEnrollment(null);
      await loadDetail();
    } catch (saveError) {
      setEnrollmentError(
        saveError instanceof Error ? saveError.message : "수강기록을 저장하지 못했습니다."
      );
    } finally {
      setEnrollmentSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Page title="회원상세" description="관리자 로그인이 필요한 메뉴입니다.">
        <Section>
          <EmptyState title="로그인 후 이용해 주세요." />
        </Section>
      </Page>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <Page title="회원상세" description="관리자 권한이 있는 계정만 접근할 수 있습니다.">
        <Section>
          <EmptyState title="관리자 권한이 필요합니다." />
        </Section>
      </Page>
    );
  }

  return (
    <Page
      title="회원상세"
      actions={
        <Link to="/users">
          <Button variant="secondary">목록</Button>
        </Link>
      }
    >
      {loading ? (
        <EmptyState title="회원 정보를 불러오는 중입니다." />
      ) : error && !detail ? (
        <EmptyState title="회원 정보를 확인할 수 없습니다." description={error} />
      ) : detail && form ? (
        <>
          {error && <p className="form-message form-message--error">{error}</p>}
          {message && <p className="form-message form-message--success">{message}</p>}

          <Section>
            <Card title={getUserName(detail.user)}>
              <form className="user-detail-form" onSubmit={(event) => void handleUserSubmit(event)}>
                <div className="user-detail-grid">
                  <TextInput
                    label="회원번호"
                    value={String(detail.user.id)}
                    disabled
                    readOnly
                  />
                  <TextInput
                    label="이름"
                    value={form.realName}
                    onChange={(event) => updateForm("realName", event.target.value)}
                    disabled={!editing}
                  />
                  <TextInput
                    label="로그인 아이디"
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                    disabled={!editing}
                  />
                  <TextInput
                    label="이메일"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    disabled={!editing}
                  />
                  <TextInput
                    label="전화번호"
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    disabled={!editing}
                  />
                  <label className="field">
                    <span className="field__label">상태</span>
                    <select
                      className="field__input"
                      value={form.status}
                      onChange={(event) => updateForm("status", event.target.value)}
                      disabled={!editing}
                    >
                      <option value="active">정상</option>
                      <option value="inactive">비활성</option>
                      <option value="blocked">차단</option>
                    </select>
                  </label>
                  <TextInput label="주소" value={address} disabled readOnly />
                </div>
                <div className="course-form__actions">
                  {editing ? (
                    <>
                      <Button type="submit" disabled={saving}>
                        {saving ? "저장 중" : "저장"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setForm(toUserForm(detail.user));
                          setEditing(false);
                        }}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setEditing(true)}>
                      기본정보 수정
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </Section>

          <Section title="수강기록">
            {detail.enrollments.length === 0 ? (
              <EmptyState title="수강기록이 없습니다." />
            ) : (
              <DataTable
                rows={detail.enrollments}
                getRowKey={(enrollment) => enrollment.id}
                columns={[
                  {
                    key: "courseId",
                    header: "과정번호",
                    render: (enrollment) => enrollment.courseId,
                  },
                  {
                    key: "courseName",
                    header: "과정명",
                    render: (enrollment) => getCourseName(enrollment),
                  },
                  {
                    key: "session",
                    header: "회차",
                    render: (enrollment) => getSessionName(enrollment),
                  },
                  {
                    key: "status",
                    header: "상태",
                    render: (enrollment) => {
                      const status = getEnrollmentStatusValue(enrollment);
                      return (
                        <Badge color={getEnrollmentStatusColor(status)}>
                          {getEnrollmentStatusLabel(enrollment)}
                        </Badge>
                      );
                    },
                  },
                  {
                    key: "actions",
                    header: "관리",
                    render: (enrollment) => (
                      <Button variant="secondary" onClick={() => void openEnrollmentModal(enrollment)}>
                        수정
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Section>

          <Section title="비밀번호 강제변경">
            <Card>
              <form className="password-reset-form" onSubmit={(event) => void handlePasswordReset(event)}>
                {resetMessage && <p className="form-message form-message--success">{resetMessage}</p>}
                <TextInput
                  label="새 비밀번호"
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비워두면 임시 비밀번호 자동 발급"
                  helpText="직접 지정할 경우 8자 이상 입력해 주세요."
                  autoComplete="off"
                />
                <div className="course-form__actions">
                  <Button type="submit" disabled={resetting}>
                    {resetting ? "변경 중" : "비밀번호 변경"}
                  </Button>
                </div>
              </form>
            </Card>
          </Section>

          {editingEnrollment && (
            <div className="modal-backdrop" role="presentation">
              <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="enrollment-modal-title">
                <div className="modal-card__header">
                  <h2 id="enrollment-modal-title">수강기록 수정</h2>
                  <Button variant="secondary" onClick={() => setEditingEnrollment(null)}>
                    닫기
                  </Button>
                </div>
                <form className="enrollment-edit-form" onSubmit={(event) => void handleEnrollmentSubmit(event)}>
                  {enrollmentError && <p className="form-message form-message--error">{enrollmentError}</p>}
                  <label className="field">
                    <span className="field__label">과정명</span>
                    <select
                      className="field__input"
                      value={enrollmentForm.courseId}
                      onChange={(event) =>
                        setEnrollmentForm((prev) => ({
                          ...prev,
                          courseId: event.target.value,
                          sessionId: "",
                        }))
                      }
                    >
                      <option value="">과정 선택</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.courseName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">회차</span>
                    <select
                      className="field__input"
                      value={enrollmentForm.sessionId}
                      onChange={(event) =>
                        setEnrollmentForm((prev) => ({
                          ...prev,
                          sessionId: event.target.value,
                        }))
                      }
                    >
                      <option value="">회차 선택</option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.sessionName || `${session.sessionNo ?? session.id}회차`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">상태</span>
                    <select
                      className="field__input"
                      value={enrollmentForm.status}
                      onChange={(event) =>
                        setEnrollmentForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    >
                      {enrollmentStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">메모</span>
                    <textarea
                      className="field__input"
                      value={enrollmentForm.memo}
                      onChange={(event) =>
                        setEnrollmentForm((prev) => ({
                          ...prev,
                          memo: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="course-form__actions">
                    <Button type="submit" disabled={enrollmentSaving}>
                      {enrollmentSaving ? "저장 중" : "저장"}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingEnrollment(null)}>
                      취소
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : null}
    </Page>
  );
}
