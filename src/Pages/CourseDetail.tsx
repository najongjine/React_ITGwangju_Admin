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
  deleteCourse,
  deleteCourseSession,
  formatCourseApiError,
  getCourse,
  saveCourseSession,
  type Course,
  type CourseSession,
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
  status: string;
};

const emptySessionForm: SessionForm = {
  id: 0,
  sessionName: "",
  sessionNo: "",
  startDate: "",
  endDate: "",
  classStartTime: "",
  classEndTime: "",
  capacity: "",
  status: "recruiting",
};

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toTimeInputValue(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function toSessionForm(session: CourseSession): SessionForm {
  return {
    id: session.id,
    sessionName: session.sessionName || "",
    sessionNo: session.sessionNo ? String(session.sessionNo) : "",
    startDate: toDateInputValue(session.startDate),
    endDate: toDateInputValue(session.endDate),
    classStartTime: toTimeInputValue(session.classStartTime),
    classEndTime: toTimeInputValue(session.classEndTime),
    capacity: session.capacity ? String(session.capacity) : "",
    status: session.status || "recruiting",
  };
}

function nullableNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
    if (!window.confirm(`'${session.sessionName}' 회차를 삭제할까요?`)) {
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
                <Badge color={course.status === "active" ? "green" : "gray"}>
                  {course.status || "상태 없음"}
                </Badge>
                <span>{course.isVisible === false ? "숨김" : "노출"}</span>
                <span>정렬 {course.sortOrder ?? 0}</span>
              </div>
            </Card>
          </Section>

          <Section title="설명 이미지">
            {course.thumbnail?.url || (course.descriptionImages && course.descriptionImages.length > 0) ? (
              <div className="detail-image-stack">
                {course.thumbnail?.url && (
                  <img src={course.thumbnail.url} alt={course.courseName} />
                )}
                {(course.descriptionImages || []).map(({ file, link }, index) =>
                  file?.url ? (
                    <img key={link.id || file.id || index} src={file.url} alt={`${course.courseName} 설명 ${index + 1}`} />
                  ) : null
                )}
              </div>
            ) : (
              <EmptyState title="등록된 설명 이미지가 없습니다." />
            )}
          </Section>

          {course.description && (
            <Section title="상세 내용">
              <Card>
                <p className="detail-description">{course.description}</p>
              </Card>
            </Section>
          )}

          <Section title="회차 관리">
            <div className="session-manager">
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
                      label="회차 번호"
                      type="number"
                      min="1"
                      value={sessionForm.sessionNo}
                      onChange={(event) => updateSessionForm("sessionNo", event.target.value)}
                    />
                    <TextInput
                      label="교육 시작일"
                      type="date"
                      value={sessionForm.startDate}
                      onChange={(event) => updateSessionForm("startDate", event.target.value)}
                    />
                    <TextInput
                      label="교육 종료일"
                      type="date"
                      value={sessionForm.endDate}
                      onChange={(event) => updateSessionForm("endDate", event.target.value)}
                    />
                    <TextInput
                      label="수업 시작 시간"
                      type="time"
                      value={sessionForm.classStartTime}
                      onChange={(event) => updateSessionForm("classStartTime", event.target.value)}
                    />
                    <TextInput
                      label="수업 종료 시간"
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
                        <option value="recruiting">모집중</option>
                        <option value="closed">마감</option>
                        <option value="active">운영중</option>
                        <option value="hidden">숨김</option>
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

              {course.sessions && course.sessions.length > 0 ? (
                <DataTable
                  rows={course.sessions}
                  getRowKey={(session) => session.id}
                  columns={[
                    {
                      key: "name",
                      header: "회차명",
                      render: (session) => session.sessionName,
                    },
                    {
                      key: "no",
                      header: "회차",
                      render: (session) => session.sessionNo ? `${session.sessionNo}회차` : "-",
                    },
                    {
                      key: "period",
                      header: "교육 기간",
                      render: (session) => `${session.startDate || "-"} ~ ${session.endDate || "-"}`,
                    },
                    {
                      key: "classTime",
                      header: "수업 시간",
                      render: (session) => `${toTimeInputValue(session.classStartTime) || "-"} ~ ${toTimeInputValue(session.classEndTime) || "-"}`,
                    },
                    {
                      key: "capacity",
                      header: "정원",
                      render: (session) => session.capacity ?? 0,
                    },
                    {
                      key: "status",
                      header: "상태",
                      render: (session) => session.status || "상태 없음",
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
            </div>
          </Section>
        </>
      ) : null}
    </Page>
  );
}
