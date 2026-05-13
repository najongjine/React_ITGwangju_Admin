import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Page, Section } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteNotice,
  formatAdminContentApiError,
  getNotice,
  type Notice,
} from "../services/adminContentApi";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value.replace("T", " ").slice(0, 16);
}

export default function NoticeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const noticeId = Number(id);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(noticeId) || noticeId <= 0) {
      setError("유효한 공지사항 ID가 아닙니다.");
      setLoading(false);
      return;
    }

    const loadNotice = async () => {
      try {
        setNotice(await getNotice(token, noticeId));
      } catch (loadError) {
        setError(formatAdminContentApiError(loadError, "공지사항 정보를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    };

    void loadNotice();
  }, [noticeId, token]);

  const handleDelete = async () => {
    if (!notice || !window.confirm(`'${notice.title}' 공지사항을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteNotice(token, notice.id);
      navigate("/notices");
    } catch (deleteError) {
      alert(formatAdminContentApiError(deleteError, "공지사항을 삭제하지 못했습니다."));
    }
  };

  return (
    <Page
      title="공지사항 상세"
      actions={
        <div className="course-form__actions">
          <Link to="/notices">
            <Button variant="secondary">목록</Button>
          </Link>
          {notice && (
            <>
              <Link to={`/notices/${notice.id}/edit`}>
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
        <EmptyState title="공지사항 정보를 불러오는 중입니다." />
      ) : error ? (
        <EmptyState title="공지사항 정보를 확인할 수 없습니다." description={error} />
      ) : notice ? (
        <>
          <Section>
            <Card title={notice.title}>
              <div className="detail-meta">
                <Badge color={notice.status === "published" ? "green" : "gray"}>
                  {notice.status || "상태 없음"}
                </Badge>
                <span>{notice.isVisible === false ? "숨김" : "노출"}</span>
                {notice.isPinned && <span>상단 고정</span>}
                <span>조회수 {notice.viewCount ?? 0}</span>
                <span>작성자 {notice.authorName || "-"}</span>
                <span>게시일 {formatDateTime(notice.publishedAt || notice.createdAt)}</span>
              </div>
            </Card>
          </Section>

          <Section title="첨부 이미지">
            {notice.images && notice.images.length > 0 ? (
              <div className="detail-image-stack">
                {notice.images.map((image, index) =>
                  image.file?.url ? (
                    <img
                      key={image.id || image.file.id || index}
                      src={image.file.url}
                      alt={`${notice.title} 이미지 ${index + 1}`}
                    />
                  ) : null
                )}
              </div>
            ) : (
              <EmptyState title="등록된 이미지가 없습니다." />
            )}
          </Section>

          {notice.content && (
            <Section title="내용">
              <Card>
                <p className="detail-description">{notice.content}</p>
              </Card>
            </Section>
          )}
        </>
      ) : null}
    </Page>
  );
}
