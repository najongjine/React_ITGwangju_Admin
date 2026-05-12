import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Page,
  Section,
  StatCard,
  TextInput,
} from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteNotice,
  formatAdminContentApiError,
  getNotices,
  type Notice,
} from "../services/adminContentApi";

const statusLabels: Record<string, string> = {
  published: "게시",
  draft: "임시저장",
  hidden: "숨김",
  deleted: "삭제됨",
};

function getStatusColor(status?: string | null): "gray" | "green" | "red" {
  if (status === "published") {
    return "green";
  }
  if (status === "deleted") {
    return "red";
  }
  return "gray";
}

function formatDate(value?: string | null) {
  return value ? value.slice(0, 10) : "-";
}

export default function NoticeList() {
  const { token } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotices = async (q = keyword) => {
    setLoading(true);
    setError("");

    try {
      setNotices(await getNotices(token, q, true));
    } catch (loadError) {
      setError(formatAdminContentApiError(loadError, "공지사항 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices("");
  }, [token]);

  const stats = useMemo(
    () => ({
      total: notices.length,
      visible: notices.filter((notice) => notice.isVisible !== false).length,
      pinned: notices.filter((notice) => notice.isPinned).length,
    }),
    [notices]
  );

  const handleDelete = async (notice: Notice) => {
    if (!window.confirm(`'${notice.title}' 공지사항을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteNotice(token, notice.id);
      await loadNotices();
    } catch (deleteError) {
      alert(formatAdminContentApiError(deleteError, "공지사항을 삭제하지 못했습니다."));
    }
  };

  return (
    <Page
      title="공지사항 관리"
      description="공지사항을 등록하고 노출 여부, 상단 고정, 이미지를 관리합니다."
      actions={
        <Link to="/notices/new">
          <Button>공지 등록</Button>
        </Link>
      }
    >
      <div className="grid grid--3">
        <StatCard label="전체 공지" value={stats.total} />
        <StatCard label="노출 중" value={stats.visible} />
        <StatCard label="상단 고정" value={stats.pinned} />
      </div>

      <Section
        title="공지사항 목록"
        actions={
          <form
            className="course-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              void loadNotices();
            }}
          >
            <TextInput
              label="검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목 또는 내용"
            />
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>
        }
      >
        {error && <p className="form-message form-message--error">{error}</p>}
        {loading ? (
          <EmptyState title="공지사항 목록을 불러오는 중입니다." />
        ) : notices.length === 0 ? (
          <EmptyState
            title="등록된 공지사항이 없습니다."
            description="새 공지 등록 버튼으로 첫 공지사항을 추가하세요."
            action={
              <Link to="/notices/new">
                <Button>공지 등록</Button>
              </Link>
            }
          />
        ) : (
          <DataTable
            rows={notices}
            getRowKey={(notice) => notice.id}
            columns={[
              {
                key: "title",
                header: "제목",
                render: (notice) => (
                  <Link className="table-link" to={`/notices/${notice.id}`}>
                    {notice.isPinned ? "[고정] " : ""}
                    {notice.title}
                  </Link>
                ),
              },
              {
                key: "visible",
                header: "노출",
                render: (notice) => (notice.isVisible === false ? "숨김" : "노출"),
              },
              {
                key: "status",
                header: "상태",
                render: (notice) => (
                  <Badge color={getStatusColor(notice.status)}>
                    {statusLabels[notice.status || ""] || notice.status || "상태 없음"}
                  </Badge>
                ),
              },
              {
                key: "views",
                header: "조회수",
                render: (notice) => notice.viewCount ?? 0,
              },
              {
                key: "date",
                header: "게시일",
                render: (notice) => formatDate(notice.publishedAt || notice.createdAt),
              },
              {
                key: "actions",
                header: "관리",
                render: (notice) => (
                  <div className="table-actions">
                    <Link to={`/notices/${notice.id}/edit`}>
                      <Button variant="secondary">수정</Button>
                    </Link>
                    <Button variant="danger" onClick={() => void handleDelete(notice)}>
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
