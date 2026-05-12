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
  deleteInquiry,
  formatAdminContentApiError,
  getInquiries,
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

function formatDate(value?: string | null) {
  return value ? value.slice(0, 10) : "-";
}

export default function InquiryList() {
  const { token } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInquiries = async (q = keyword, nextStatus = status) => {
    setLoading(true);
    setError("");

    try {
      setInquiries(await getInquiries(token, q, nextStatus));
    } catch (loadError) {
      setError(formatAdminContentApiError(loadError, "문의사항 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInquiries("", "");
  }, [token]);

  const stats = useMemo(
    () => ({
      total: inquiries.length,
      waiting: inquiries.filter((inquiry) => inquiry.status === "waiting").length,
      answered: inquiries.filter((inquiry) => inquiry.status === "answered").length,
    }),
    [inquiries]
  );

  const handleDelete = async (inquiry: Inquiry) => {
    if (!window.confirm(`'${inquiry.title || "문의"}' 문의사항을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteInquiry(token, inquiry.id);
      await loadInquiries();
    } catch (deleteError) {
      alert(formatAdminContentApiError(deleteError, "문의사항을 삭제하지 못했습니다."));
    }
  };

  return (
    <Page
      title="문의사항 관리"
      description="사용자 문의를 확인하고 답변 상태를 관리합니다."
    >
      <div className="grid grid--3">
        <StatCard label="전체 문의" value={stats.total} />
        <StatCard label="답변 대기" value={stats.waiting} />
        <StatCard label="답변 완료" value={stats.answered} />
      </div>

      <Section
        title="문의사항 목록"
        actions={
          <form
            className="course-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              void loadInquiries();
            }}
          >
            <TextInput
              label="검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목, 내용, 이메일"
            />
            <label className="field">
              <span className="field__label">상태</span>
              <select
                className="field__input"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  void loadInquiries(keyword, event.target.value);
                }}
              >
                <option value="">전체</option>
                <option value="waiting">답변 대기</option>
                <option value="answered">답변 완료</option>
                <option value="closed">종료</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </form>
        }
      >
        {error && <p className="form-message form-message--error">{error}</p>}
        {loading ? (
          <EmptyState title="문의사항 목록을 불러오는 중입니다." />
        ) : inquiries.length === 0 ? (
          <EmptyState title="조회된 문의사항이 없습니다." />
        ) : (
          <DataTable
            rows={inquiries}
            getRowKey={(inquiry) => inquiry.id}
            columns={[
              {
                key: "title",
                header: "제목",
                render: (inquiry) => (
                  <Link className="table-link" to={`/inquiries/${inquiry.id}`}>
                    {inquiry.title || "제목 없음"}
                  </Link>
                ),
              },
              {
                key: "customer",
                header: "문의자",
                render: (inquiry) => (
                  <div className="table-stack">
                    <strong>{inquiry.name || "-"}</strong>
                    <span>{inquiry.email || "-"}</span>
                  </div>
                ),
              },
              {
                key: "status",
                header: "상태",
                render: (inquiry) => (
                  <Badge color={getStatusColor(inquiry.status)}>
                    {statusLabels[inquiry.status || ""] || inquiry.status || "상태 없음"}
                  </Badge>
                ),
              },
              {
                key: "created",
                header: "접수일",
                render: (inquiry) => formatDate(inquiry.createdAt),
              },
              {
                key: "answered",
                header: "답변일",
                render: (inquiry) => formatDate(inquiry.answeredAt),
              },
              {
                key: "actions",
                header: "관리",
                render: (inquiry) => (
                  <div className="table-actions">
                    <Link to={`/inquiries/${inquiry.id}`}>
                      <Button variant="secondary">답변</Button>
                    </Link>
                    <Button variant="danger" onClick={() => void handleDelete(inquiry)}>
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
