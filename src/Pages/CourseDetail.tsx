import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import {
  COURSE_STATUSES,
  deleteCourse,
  deleteCourseSession,
  formatCourseApiError,
  getCourse,
  getCourseSessionEnrollments,
  getCourseStatusLabel,
  normalizeCourseStatus,
  saveCourseSession,
  type Course,
  type CourseEnrollment,
  type CourseSession,
  type CourseStatus,
} from "../services/courseApi";

type SessionForm = {
  id: number;
  sessionName: string;
  sessionNo: string;
  startDate: string;
  endDate: string;
  classStartTime: string;
  classEndTime: string;
  capacity: string;
  status: CourseStatus;
};

const emptySessionForm: SessionForm = {
  id: 0,
  sessionName: "",
  sessionNo: "",
  startDate: "",
  endDate: "",
  classStartTime: "",
  classEndTime: "",
  capacity: "20",
  status: "모집중",
};

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toTimeInputValue(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function toDisplayDate(value?: string | null) {
  return toDateInputValue(value) || "-";
}

function getStatusColor(status?: string | null): "gray" | "green" | "blue" | "red" {
  const normalized = normalizeCourseStatus(status);

  if (normalized === "모집중") {
    return "blue";
  }

  if (normalized === "운영중") {
    return "green";
  }

  if (normalized === "마감" || normalized === "deleted") {
    return "red";
  }

  return "gray";
}

function toSessionForm(session: CourseSession): SessionForm {
  const normalizedStatus = normalizeCourseStatus(session.status);

  return {
    id: session.id,
    sessionName: session.sessionName || "",
    sessionNo: session.sessionNo ? String(session.sessionNo) : "",
    startDate: toDateInputValue(session.startDate),
    endDate: toDateInputValue(session.endDate),
    classStartTime: toTimeInputValue(session.classStartTime),
    classEndTime: toTimeInputValue(session.classEndTime),
    capacity: session.capacity ? String(session.capacity) : "20",
    status: normalizedStatus && normalizedStatus !== "deleted" ? normalizedStatus : "모집중",
  };
}

function nullableNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getEnrollmentUserName(enrollment: CourseEnrollment) {
  return (
    enrollment.user?.realName ||
    enrollment.user?.name ||
    enrollment.user?.username ||
    `회원 ${enrollment.userId ?? "-"}`
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [enrollmentSession, setEnrollmentSession] = useState<CourseSession | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState("");

  const loadCourse = async () => {
    setCourse(await getCourse(courseId));
  };

  useEffect(() => {
    if (!Number.isFinite(courseId) || courseId <= 0) {
      setError("유효한 과정 ID가 아닙니다.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        await loadCourse();
      } catch (loadError) {
        setError(formatCourseApiError(loadError, "과정 정보를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [courseId]);

  const handleDelete = async () => {
    if (!course || !window.confirm(`'${course.courseName}' 과정을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteCourse(course.id);
      navigate("/courses");
    } catch (deleteError) {
      alert(formatCourseApiError(deleteError, "과정을 삭제하지 못했습니다."));
    }
  };

  const updateSessionForm = (name: keyof SessionForm, value: string) => {
    setSessionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetSessionForm = () => {
    setSessionForm(emptySessionForm);
    setSessionError("");
  };

  const handleSessionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSessionError("");

    if (!sessionForm.sessionName.trim()) {
      setSessionError("회차명을 입력하세요.");
      return;
    }

    setSessionSaving(true);

    try {
      await saveCourseSession(courseId, {
        id: sessionForm.id,
        sessionName: sessionForm.sessionName.trim(),
        sessionNo: nullableNumber(sessionForm.sessionNo),
        startDate: sessionForm.startDate || null,
        endDate: sessionForm.endDate || null,
        classStartTime: sessionForm.classStartTime || null,
        classEndTime: sessionForm.classEndTime || null,
        capacity: Number(sessionForm.capacity) || 20,
        status: sessionForm.status,
      });
      resetSessionForm();
      await loadCourse();
    } catch (saveError) {
      setSessionError(formatCourseApiError(saveError, "회차를 저장하지 못했습니다."));
    } finally {
      setSessionSaving(false);
    }
  };

  const handleSessionDelete = async (session: CourseSession) => {
    if (!window.confirm(`'${session.sessionName || `${session.sessionNo ?? ""}회차`}' 회차를 삭제할까요?`)) {
      return;
    }

    setSessionError("");

    try {
      await deleteCourseSession(courseId, session.id);
      if (sessionForm.id === session.id) {
        resetSessionForm();
      }
      await loadCourse();
    } catch (deleteError) {
      setSessionError(formatCourseApiError(deleteError, "회차를 삭제하지 못했습니다."));
    }
  };

  const handleEnrollmentOpen = async (session: CourseSession) => {
    setEnrollmentSession(session);
    setEnrollmentLoading(true);
    setEnrollmentError("");
    setEnrollments([]);

    try {
      setEnrollments(await getCourseSessionEnrollments(courseId, session.id));
    } catch (loadError) {
      setEnrollmentError(formatCourseApiError(loadError, "회차 신청 인원 목록을 불러오지 못했습니다."));
    } finally {
      setEnrollmentLoading(false);
    }
  };

  return (
    <Page
      title="과정 상세"
      actions={
        <div className="course-form__actions">
          <Link to="/courses">
            <Button variant="secondary">목록</Button>
          </Link>
          {course && (
            <>
              <Link to={`/courses/${course.id}/edit`}>
                <Button>수정</Button>
              </Link>
              <Button variant="danger" onClick={() => void handleDelete()}>
                삭제
              </Button>
            </>
          )}
        </div>
      }
    >
      {loading ? (
        <EmptyState title="과정 정보를 불러오는 중입니다." />
      ) : error ? (
        <EmptyState title="과정 정보를 확인할 수 없습니다." description={error} />
      ) : course ? (
        <>
          <Section>
            <Card title={course.courseName} description={course.summary || undefined}>
              <div className="detail-meta">
                <Badge color={getStatusColor(course.status)}>
                  {getCourseStatusLabel(course.status)}
                </Badge>
                <span>{course.isVisible === false ? "숨김" : "노출"}</span>
                <span>정렬 {course.sortOrder ?? 0}</span>
                <span>회차 {course.sessionCount ?? course.sessions?.length ?? 0}개</span>
                <span>총 정원 {course.totalCapacity ?? 0}명</span>
                <span>총 신청 {course.totalEnrollment ?? 0}명</span>
              </div>
            </Card>
          </Section>

          <Section title="이미지">
            {course.thumbnail?.url || (course.descriptionImages && course.descriptionImages.length > 0) ? (
              <div className="detail-image-stack">
                {course.thumbnail?.url && (
                  <img src={course.thumbnail.url} alt={`${course.courseName} 메인이미지`} />
                )}
                {(course.descriptionImages || []).map(({ file, link }, index) =>
                  file?.url ? (
                    <img
                      key={link.id || file.id || index}
                      src={file.url}
                      alt={`${course.courseName} 서브 이미지 ${index + 1}`}
                    />
                  ) : null
                )}
              </div>
            ) : (
              <EmptyState title="등록된 이미지가 없습니다." />
            )}
          </Section>

          {course.description && (
            <Section title="상세내용">
              <Card>
                <p className="detail-description">{course.description}</p>
              </Card>
            </Section>
          )}

          <Section title="회차 등록">
            <Card title={sessionForm.id > 0 ? "회차 수정" : "회차 등록"}>
              <form className="session-form" onSubmit={(event) => void handleSessionSubmit(event)}>
                {sessionError && <p className="form-message form-message--error">{sessionError}</p>}
                <div className="course-form__grid">
                  <TextInput
                    label="회차명"
                    value={sessionForm.sessionName}
                    onChange={(event) => updateSessionForm("sessionName", event.target.value)}
                    required
                  />
                  <TextInput
                    label="회차번호"
                    type="number"
                    min="1"
                    value={sessionForm.sessionNo}
                    onChange={(event) => updateSessionForm("sessionNo", event.target.value)}
                  />
                  <TextInput
                    label="교육시작일"
                    type="date"
                    value={sessionForm.startDate}
                    onChange={(event) => updateSessionForm("startDate", event.target.value)}
                  />
                  <TextInput
                    label="교육종료일"
                    type="date"
                    value={sessionForm.endDate}
                    onChange={(event) => updateSessionForm("endDate", event.target.value)}
                  />
                  <TextInput
                    label="수업시작시간"
                    type="time"
                    value={sessionForm.classStartTime}
                    onChange={(event) => updateSessionForm("classStartTime", event.target.value)}
                  />
                  <TextInput
                    label="수업종료시간"
                    type="time"
                    value={sessionForm.classEndTime}
                    onChange={(event) => updateSessionForm("classEndTime", event.target.value)}
                  />
                  <TextInput
                    label="정원"
                    type="number"
                    min="0"
                    value={sessionForm.capacity}
                    onChange={(event) => updateSessionForm("capacity", event.target.value)}
                  />
                  <label className="field">
                    <span className="field__label">상태</span>
                    <select
                      className="field__input"
                      value={sessionForm.status}
                      onChange={(event) => updateSessionForm("status", event.target.value)}
                    >
                      {COURSE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="course-form__actions">
                  <Button type="submit" disabled={sessionSaving}>
                    {sessionSaving ? "저장 중" : sessionForm.id > 0 ? "회차 수정" : "회차 등록"}
                  </Button>
                  {sessionForm.id > 0 && (
                    <Button variant="secondary" onClick={resetSessionForm}>
                      새 회차 입력
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </Section>

          <Section title="회차 목록">
            {course.sessions && course.sessions.length > 0 ? (
              <DataTable
                rows={course.sessions}
                getRowKey={(session) => session.id}
                columns={[
                  {
                    key: "name",
                    header: "회차명",
                    render: (session) => session.sessionName || "-",
                  },
                  {
                    key: "no",
                    header: "회차",
                    render: (session) => (session.sessionNo ? `${session.sessionNo}회차` : "-"),
                  },
                  {
                    key: "period",
                    header: "교육기간",
                    render: (session) => `${toDisplayDate(session.startDate)} ~ ${toDisplayDate(session.endDate)}`,
                  },
                  {
                    key: "classTime",
                    header: "수업시간",
                    render: (session) =>
                      `${toTimeInputValue(session.classStartTime) || "-"} ~ ${
                        toTimeInputValue(session.classEndTime) || "-"
                      }`,
                  },
                  {
                    key: "capacity",
                    header: "정원",
                    render: (session) => `${session.capacity ?? 0}명`,
                  },
                  {
                    key: "status",
                    header: "상태",
                    render: (session) => (
                      <Badge color={getStatusColor(session.status)}>
                        {getCourseStatusLabel(session.status)}
                      </Badge>
                    ),
                  },
                  {
                    key: "totalEnrollment",
                    header: "총인원",
                    render: (session) => (
                      <button className="link-button" onClick={() => void handleEnrollmentOpen(session)}>
                        {session.totalEnrollment ?? 0}명
                      </button>
                    ),
                  },
                  {
                    key: "actions",
                    header: "관리",
                    render: (session) => (
                      <div className="table-actions">
                        <Button variant="secondary" onClick={() => setSessionForm(toSessionForm(session))}>
                          수정
                        </Button>
                        <Button variant="danger" onClick={() => void handleSessionDelete(session)}>
                          삭제
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState title="등록된 회차가 없습니다." />
            )}
          </Section>

          {enrollmentSession && (
            <Section
              title="회차별 신청 인원"
              description={`${enrollmentSession.sessionName || `${enrollmentSession.sessionNo ?? ""}회차`} 신청자 목록입니다.`}
              actions={
                <Button variant="secondary" onClick={() => setEnrollmentSession(null)}>
                  닫기
                </Button>
              }
            >
              {enrollmentError && <p className="form-message form-message--error">{enrollmentError}</p>}
              {enrollmentLoading ? (
                <EmptyState title="신청 인원 목록을 불러오는 중입니다." />
              ) : enrollments.length > 0 ? (
                <DataTable
                  rows={enrollments}
                  getRowKey={(enrollment) => enrollment.id}
                  columns={[
                    {
                      key: "id",
                      header: "회원번호",
                      render: (enrollment) => enrollment.user?.id ?? enrollment.userId ?? "-",
                    },
                    {
                      key: "username",
                      header: "username",
                      render: (enrollment) => getEnrollmentUserName(enrollment),
                    },
                    {
                      key: "email",
                      header: "이메일",
                      render: (enrollment) => enrollment.user?.email || "-",
                    },
                    {
                      key: "phone",
                      header: "전화번호",
                      render: (enrollment) => enrollment.user?.phone || enrollment.user?.phoneNumber || "-",
                    },
                  ]}
                />
              ) : (
                <EmptyState title="신청 인원이 없습니다." />
              )}
            </Section>
          )}
        </>
      ) : null}
    </Page>
  );
}
