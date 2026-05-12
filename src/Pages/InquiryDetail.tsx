import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Page, Section } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import {
  answerInquiry,
  deleteInquiry,
  formatAdminContentApiError,
  getInquiry,
  updateInquiryStatus,
  type Inquiry,
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
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("waiting");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadInquiry = async () => {
    const loaded = await getInquiry(token, inquiryId);
    setInquiry(loaded);
    setAnswer(loaded.answer || "");
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

    if (!answer.trim() && status === "answered") {
      setError("답변 완료 상태로 저장하려면 답변 내용을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      if (answer.trim()) {
        const saved = await answerInquiry(token, inquiryId, {
          answer: answer.trim(),
          status,
        });
        setInquiry(saved);
        setAnswer(saved.answer || "");
        setStatus(saved.status || "answered");
      } else {
        const saved = await updateInquiryStatus(token, inquiryId, status);
        setInquiry(saved);
        setStatus(saved.status || status);
      }
      setMessage("문의사항이 저장되었습니다.");
    } catch (saveError) {
      setError(formatAdminContentApiError(saveError, "문의사항을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
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
              {inquiry.content && <p className="detail-description">{inquiry.content}</p>}
            </Card>
          </Section>

          <Section title="답변 관리">
            <Card title="관리자 답변">
              <form className="session-form" onSubmit={(event) => void handleSubmit(event)}>
                {error && <p className="form-message form-message--error">{error}</p>}
                {message && <p className="form-message form-message--success">{message}</p>}
                <label className="field">
                  <span className="field__label">상태</span>
                  <select
                    className="field__input"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="waiting">답변 대기</option>
                    <option value="answered">답변 완료</option>
                    <option value="closed">종료</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">답변 내용</span>
                  <textarea
                    className="field__input"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                </label>
                <div className="course-form__actions">
                  <Button type="submit" disabled={saving}>
                    {saving ? "저장 중" : "답변 저장"}
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
