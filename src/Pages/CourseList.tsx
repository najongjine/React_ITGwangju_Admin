import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Page,
  Section,
  TextInput,
} from "../components/common";
import {
  deleteCourse,
  formatCourseApiError,
  getCourses,
  type Course,
} from "../services/courseApi";

const statusLabels: Record<string, string> = {
  active: "운영중",
  hidden: "숨김",
  deleted: "삭제됨",
};

function getStatusColor(status?: string | null): "gray" | "green" | "red" {
  if (status === "active") {
    return "green";
  }
  if (status === "deleted") {
    return "red";
  }
  return "gray";
}

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourses = async (q = keyword) => {
    setLoading(true);
    setError("");

    try {
      setCourses(await getCourses(q));
    } catch (loadError) {
      setError(formatCourseApiError(loadError, "과정 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses("");
  }, []);

  const visibleCount = useMemo(
    () => courses.filter((course) => course.status !== "deleted" && course.isVisible !== false).length,
    [courses]
  );

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`'${course.courseName}' 과정을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteCourse(course.id);
      await loadCourses();
    } catch (deleteError) {
      alert(formatCourseApiError(deleteError, "과정을 삭제하지 못했습니다."));
    }
  };

  return (
    <Page
      title="과정 관리"
      description={`등록된 과정 ${courses.length}개 중 ${visibleCount}개가 노출 중입니다.`}
      actions={
        <Link to="/courses/new">
          <Button>과정 등록</Button>
        </Link>
      }
    >
      <Section
        title="과정 목록"
        actions={
          <form
            className="course-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              void loadCourses();
            }}
          >
            <TextInput
              label="검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="과정명 또는 요약"
            />
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>
        }
      >
        {error && <p className="form-message form-message--error">{error}</p>}
        {loading ? (
          <EmptyState title="과정 목록을 불러오는 중입니다." />
        ) : courses.length === 0 ? (
          <EmptyState
            title="등록된 과정이 없습니다."
            description="새 과정 등록 버튼으로 첫 과정을 추가하세요."
            action={
              <Link to="/courses/new">
                <Button>과정 등록</Button>
              </Link>
            }
          />
        ) : (
          <DataTable
            rows={courses}
            getRowKey={(course) => course.id}
            columns={[
              {
                key: "thumb",
                header: "이미지",
                render: (course) =>
                  course.thumbnail?.url ? (
                    <img className="table-thumbnail" src={course.thumbnail.url} alt="" />
                  ) : (
                    <span className="muted">없음</span>
                  ),
              },
              {
                key: "name",
                header: "과정명",
                render: (course) => (
                  <Link className="table-link" to={`/courses/${course.id}`}>
                    {course.courseName}
                  </Link>
                ),
              },
              {
                key: "summary",
                header: "요약",
                render: (course) => course.summary || <span className="muted">-</span>,
              },
              {
                key: "visible",
                header: "노출",
                render: (course) => (course.isVisible === false ? "숨김" : "노출"),
              },
              {
                key: "status",
                header: "상태",
                render: (course) => (
                  <Badge color={getStatusColor(course.status)}>
                    {statusLabels[course.status || ""] || course.status || "상태 없음"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "관리",
                render: (course) => (
                  <div className="table-actions">
                    <Link to={`/courses/${course.id}/edit`}>
                      <Button variant="secondary">수정</Button>
                    </Link>
                    <Button variant="danger" onClick={() => void handleDelete(course)}>
                      삭제
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Section>
    </Page>
  );
}
