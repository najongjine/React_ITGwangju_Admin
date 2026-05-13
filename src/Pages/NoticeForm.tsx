import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, EmptyState, Page, Section, TextInput } from "../components/common";
import { useAuth } from "../contexts/AuthContext";
import {
  formatAdminContentApiError,
  getNotice,
  saveNotice,
  type NoticeImageLink,
} from "../services/adminContentApi";

type ImageDraft = {
  id: string;
  name: string;
  url: string;
  file?: File;
  existing?: NoticeImageLink;
};

type FormState = {
  title: string;
  content: string;
  authorName: string;
  isVisible: boolean;
  isPinned: boolean;
  status: string;
  publishedAt: string;
};

const initialForm: FormState = {
  title: "",
  content: "",
  authorName: "",
  isVisible: true,
  isPinned: false,
  status: "published",
  publishedAt: "",
};

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function revokeDraftUrls(drafts: ImageDraft[]) {
  for (const draft of drafts) {
    if (draft.file) {
      URL.revokeObjectURL(draft.url);
    }
  }
}

function moveDraft<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function NoticeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const noticeId = id ? Number(id) : 0;
  const isEdit = Number.isFinite(noticeId) && noticeId > 0;
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [draggedImageId, setDraggedImageId] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imagesRef = useRef<ImageDraft[]>([]);
  const draggedImageIdRef = useRef("");

  useEffect(() => {
    if (!isEdit) {
      setForm((prev) => ({
        ...prev,
        authorName: user?.realName || user?.name || user?.email || "",
      }));
      return;
    }

    const loadNotice = async () => {
      try {
        const loaded = await getNotice(token, noticeId);
        setForm({
          title: loaded.title || "",
          content: loaded.content || "",
          authorName: loaded.authorName || user?.realName || user?.name || user?.email || "",
          isVisible: loaded.isVisible !== false,
          isPinned: Boolean(loaded.isPinned),
          status: loaded.status || "published",
          publishedAt: toDateInputValue(loaded.publishedAt),
        });
        setImages(
          (loaded.images || []).map((image, index) => ({
            id: `existing-${image.file?.id || image.id || index}`,
            name: image.file?.originalName || image.file?.storedName || `이미지 ${index + 1}`,
            url: image.file?.url || "",
            existing: image,
          }))
        );
      } catch (loadError) {
        setError(formatAdminContentApiError(loadError, "공지사항 정보를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    };

    void loadNotice();
  }, [isEdit, noticeId, token, user]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => revokeDraftUrls(imagesRef.current);
  }, []);

  const updateForm = (name: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImagesChange = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const drafts = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Date.now()}-${Math.random()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...drafts]);
  };

  const removeImage = (idToRemove: string) => {
    setImages((prev) => {
      const removed = prev.find((draft) => draft.id === idToRemove);
      if (removed?.file) {
        URL.revokeObjectURL(removed.url);
      }

      return prev.filter((draft) => draft.id !== idToRemove);
    });
  };

  const moveImage = (draggedId: string, targetId: string) => {
    setImages((prev) => {
      const fromIndex = prev.findIndex((draft) => draft.id === draggedId);
      const toIndex = prev.findIndex((draft) => draft.id === targetId);
      return moveDraft(prev, fromIndex, toIndex);
    });
  };

  const handleImageDragStart = (event: DragEvent<HTMLDivElement>, draftId: string) => {
    draggedImageIdRef.current = draftId;
    setDraggedImageId(draftId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draftId);
  };

  const handleImageDragEnter = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const draggedId = draggedImageIdRef.current || draggedImageId;
    if (draggedId && draggedId !== targetId) {
      moveImage(draggedId, targetId);
    }
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggedImageIdRef.current = "";
    setDraggedImageId("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      const existingImageDrafts = images.filter((draft) => draft.existing?.file?.id);
      const newImageDrafts = images.filter((draft) => draft.file);
      const imageOrders = [
        ...existingImageDrafts.map((draft) => images.findIndex((image) => image.id === draft.id)),
        ...newImageDrafts.map((draft) => images.findIndex((image) => image.id === draft.id)),
      ];

      const saved = await saveNotice(token, {
        id: isEdit ? noticeId : 0,
        title: form.title.trim(),
        content: form.content,
        authorName: form.authorName,
        isVisible: form.isVisible,
        isPinned: form.isPinned,
        status: form.status,
        publishedAt: form.publishedAt || undefined,
        imageFileIds: existingImageDrafts
          .map((draft) => draft.existing?.file?.id)
          .filter((fileId): fileId is number => Boolean(fileId)),
        imageOrders,
        images: newImageDrafts.map((draft) => draft.file).filter((file): file is File => Boolean(file)),
      });

      navigate(`/notices/${saved.id}`);
    } catch (saveError) {
      setError(formatAdminContentApiError(saveError, "공지사항을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title={isEdit ? "공지사항 수정" : "공지사항 등록"}
      description="공지 제목, 내용, 노출 상태와 첨부 이미지를 관리합니다."
      actions={
        <Link to={isEdit ? `/notices/${noticeId}` : "/notices"}>
          <Button variant="secondary">취소</Button>
        </Link>
      }
    >
      {loading ? (
        <EmptyState title="공지사항 정보를 불러오는 중입니다." />
      ) : (
        <form className="course-form" onSubmit={(event) => void handleSubmit(event)}>
          {error && <p className="form-message form-message--error">{error}</p>}

          <Section title="기본 정보">
            <Card title="공지 정보">
              <div className="course-form__grid">
                <TextInput
                  label="제목"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  required
                />
                <TextInput
                  label="작성자"
                  value={form.authorName}
                  onChange={(event) => updateForm("authorName", event.target.value)}
                />
                <label className="field">
                  <span className="field__label">상태</span>
                  <select
                    className="field__input"
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                  >
                    <option value="published">게시</option>
                    <option value="draft">임시저장</option>
                    <option value="hidden">숨김</option>
                  </select>
                </label>
                <TextInput
                  label="게시일"
                  type="date"
                  value={form.publishedAt}
                  onChange={(event) => updateForm("publishedAt", event.target.value)}
                />
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(event) => updateForm("isVisible", event.target.checked)}
                  />
                  <span>노출</span>
                </label>
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(event) => updateForm("isPinned", event.target.checked)}
                  />
                  <span>상단 고정</span>
                </label>
              </div>

              <label className="field">
                <span className="field__label">내용</span>
                <textarea
                  className="field__input"
                  value={form.content}
                  onChange={(event) => updateForm("content", event.target.value)}
                />
              </label>
            </Card>
          </Section>

          <Section title="이미지">
            <Card title="첨부 이미지">
              <label className="field">
                <span className="field__label">이미지 파일</span>
                <input
                  className="field__input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    handleImagesChange(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {images.length > 0 ? (
                <div className="image-preview-grid image-preview-grid--columns">
                  {images.map((draft, index) => (
                    <div
                      className={`image-preview-item${
                        draggedImageId === draft.id ? " image-preview-item--dragging" : ""
                      }`}
                      key={draft.id}
                      draggable
                      onDragStart={(event) => handleImageDragStart(event, draft.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDragEnter={(event) => handleImageDragEnter(event, draft.id)}
                      onDrop={handleImageDrop}
                      onDragEnd={() => {
                        draggedImageIdRef.current = "";
                        setDraggedImageId("");
                      }}
                    >
                      <div className="image-preview-item__info">
                        <p>
                          {index + 1}. {draft.name}
                        </p>
                        <Button variant="danger" onClick={() => removeImage(draft.id)}>
                          삭제
                        </Button>
                      </div>
                      {draft.url && (
                        <img src={draft.url} alt={`${draft.name} 미리보기`} draggable={false} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="선택된 이미지가 없습니다." />
              )}
            </Card>
          </Section>

          <div className="course-form__actions">
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중" : "저장"}
            </Button>
            <Link to={isEdit ? `/notices/${noticeId}` : "/notices"}>
              <Button variant="secondary">취소</Button>
            </Link>
          </div>
        </form>
      )}
    </Page>
  );
}
