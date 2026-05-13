import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Page, Section } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import {
  addInquiryReply,
  deleteInquiry,
  deleteInquiryReply,
  formatAdminContentApiError,
  getInquiry,
  updateInquiryStatus,
  type Inquiry,
  type InquiryReply,
} from "../services/adminContentApi";

const statusLabels: Record<string, string> = {
  waiting: "답변 대기",
  answered: "답변 완료",
  closed: "종료",
  deleted: "삭제됨",
};

function getStatusColor(status?: string | null): "gray" | "green" | "blue" | "red" {
  if (status === "answered") {
    return "green";
  }
  if (status === "waiting") {
    return "blue";
  }
  if (status === "deleted") {
    return "red";
  }
  return "gray";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value.replace("T", " ").slice(0, 16);
}

export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const inquiryId = Number(id);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [status, setStatus] = useState("waiting");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadInquiry = async () => {
    const loaded = await getInquiry(token, inquiryId);
    setInquiry(loaded);
    setStatus(loaded.status || "waiting");
  };

  useEffect(() => {
    if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
      setError("유효한 문의사항 ID가 아닙니다.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        await loadInquiry();
      } catch (loadError) {
        setError(formatAdminContentApiError(loadError, "문의사항 정보를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [inquiryId, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!replyContent.trim()) {
      setError("답글 내용을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      await addInquiryReply(token, inquiryId, replyContent.trim());
      setReplyContent("");
      await loadInquiry();
      setMessage("답글이 등록되었습니다.");
    } catch (saveError) {
      setError(formatAdminContentApiError(saveError, "답글을 등록하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus: string) => {
    setError("");
    setMessage("");
    setStatus(nextStatus);
    setSaving(true);

    try {
      const saved = await updateInquiryStatus(token, inquiryId, nextStatus);
      setInquiry(saved);
      setStatus(saved.status || nextStatus);
      setMessage("상태가 변경되었습니다.");
    } catch (saveError) {
      setError(formatAdminContentApiError(saveError, "상태를 변경하지 못했습니다."));
      setStatus(inquiry?.status || "waiting");
    } finally {
      setSaving(false);
    }
  };

  const handleReplyDelete = async (reply: InquiryReply) => {
    if (!window.confirm("이 답글을 삭제할까요?")) {
      return;
    }

    try {
      await deleteInquiryReply(token, inquiryId, reply.id);
      await loadInquiry();
      setMessage("답글이 삭제되었습니다.");
    } catch (deleteError) {
      alert(formatAdminContentApiError(deleteError, "답글을 삭제하지 못했습니다."));
    }
  };

  const handleDelete = async () => {
    if (!inquiry || !window.confirm(`'${inquiry.title || "문의"}' 문의사항을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteInquiry(token, inquiry.id);
      navigate("/inquiries");
    } catch (deleteError) {
      alert(formatAdminContentApiError(deleteError, "문의사항을 삭제하지 못했습니다."));
    }
  };

  return (
    <Page
      title="문의사항 상세"
      actions={
        <div className="course-form__actions">
          <Link to="/inquiries">
            <Button variant="secondary">목록</Button>
          </Link>
          {inquiry && (
            <Button variant="danger" onClick={() => void handleDelete()}>
              삭제
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <EmptyState title="문의사항 정보를 불러오는 중입니다." />
      ) : error && !inquiry ? (
        <EmptyState title="문의사항 정보를 확인할 수 없습니다." description={error} />
      ) : inquiry ? (
        <>
          <Section>
            <Card title={inquiry.title || "제목 없음"}>
              <div className="detail-meta">
                <Badge color={getStatusColor(inquiry.status)}>
                  {statusLabels[inquiry.status || ""] || inquiry.status || "상태 없음"}
                </Badge>
                <span>접수일 {formatDateTime(inquiry.createdAt)}</span>
                <span>답변일 {formatDateTime(inquiry.answeredAt)}</span>
              </div>
              <div className="inquiry-contact">
                <span>이름: {inquiry.name || "-"}</span>
                <span>이메일: {inquiry.email || "-"}</span>
                <span>연락처: {inquiry.phone || "-"}</span>
              </div>
            </Card>
          </Section>

          <Section title="답글">
            <div className="inquiry-thread">
              <article className="inquiry-thread__item inquiry-thread__item--user">
                <div className="inquiry-thread__meta">
                  <strong>{inquiry.name || "문의자"}</strong>
                  <span>{formatDateTime(inquiry.createdAt)}</span>
                </div>
                <p>{inquiry.content || "-"}</p>
              </article>

              {(inquiry.replies || []).length > 0 ? (
                (inquiry.replies || []).map((reply) => (
                  <article
                    className={`inquiry-thread__item inquiry-thread__item--${reply.authorRole === "admin" ? "admin" : "user"}`}
                    key={reply.id}
                  >
                    <div className="inquiry-thread__meta">
                      <strong>{reply.authorRole === "admin" ? "관리자" : "문의자"}</strong>
                      <span>{formatDateTime(reply.createdAt)}</span>
                    </div>
                    <p>{reply.content}</p>
                    <div className="course-form__actions">
                      <Button variant="danger" onClick={() => void handleReplyDelete(reply)}>
                        삭제
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="등록된 답글이 없습니다." />
              )}
            </div>
          </Section>

          <Section title="답글 관리">
            <Card title="관리자 답글">
              <form className="session-form" onSubmit={(event) => void handleSubmit(event)}>
                {error && <p className="form-message form-message--error">{error}</p>}
                {message && <p className="form-message form-message--success">{message}</p>}
                <label className="field">
                  <span className="field__label">상태</span>
                  <select
                    className="field__input"
                    value={status}
                    onChange={(event) => void handleStatusChange(event.target.value)}
                    disabled={saving}
                  >
                    <option value="waiting">답변 대기</option>
                    <option value="answered">답변 완료</option>
                    <option value="closed">종료</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">답글 내용</span>
                  <textarea
                    className="field__input"
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                  />
                </label>
                <div className="course-form__actions">
                  <Button type="submit" disabled={saving}>
                    {saving ? "저장 중" : "답글 등록"}
                  </Button>
                </div>
              </form>
            </Card>
          </Section>
        </>
      ) : null}
    </Page>
  );
}
