import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, EmptyState, Page, Section, TextInput } from "../components/common";
import {
  COURSE_STATUSES,
  formatCourseApiError,
  getCourse,
  normalizeCourseStatus,
  saveCourse,
  type Course,
  type CourseImageLink,
  type CourseStatus,
} from "../services/courseApi";

type DescriptionImageDraft = {
  id: string;
  name: string;
  url: string;
  file?: File;
  existing?: CourseImageLink;
};

type FormState = {
  courseName: string;
  summary: string;
  description: string;
  isVisible: boolean;
  status: CourseStatus;
  sortOrder: number;
};

const initialForm: FormState = {
  courseName: "",
  summary: "",
  description: "",
  isVisible: true,
  status: "모집중",
  sortOrder: 0,
};

function revokeDraftUrls(drafts: DescriptionImageDraft[]) {
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

async function fileFromExistingImage(draft: DescriptionImageDraft, index: number) {
  if (draft.file) {
    return draft.file;
  }

  const source = draft.existing?.file;
  if (!source?.url) {
    return null;
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`${draft.name} 이미지를 다시 불러오지 못했습니다.`);
  }

  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "webp";
  const fileName = source.originalName || source.storedName || `description-${index + 1}.${extension}`;

  return new File([blob], fileName, {
    type: blob.type || source.mimeType || "application/octet-stream",
  });
}

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = id ? Number(id) : 0;
  const isEdit = Number.isFinite(courseId) && courseId > 0;
  const [form, setForm] = useState<FormState>(initialForm);
  const [course, setCourse] = useState<Course | null>(null);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreviewUrl, setMainPreviewUrl] = useState("");
  const [descriptionImages, setDescriptionImages] = useState<DescriptionImageDraft[]>([]);
  const [draggedDescriptionImageId, setDraggedDescriptionImageId] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mainObjectUrlRef = useRef("");
  const descriptionImagesRef = useRef<DescriptionImageDraft[]>([]);
  const draggedDescriptionImageIdRef = useRef("");

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const loadCourse = async () => {
      try {
        const loaded = await getCourse(courseId);
        const normalizedStatus = normalizeCourseStatus(loaded.status);
        setCourse(loaded);
        setForm({
          courseName: loaded.courseName || "",
          summary: loaded.summary || "",
          description: loaded.description || "",
          isVisible: loaded.isVisible !== false,
          status: normalizedStatus && normalizedStatus !== "deleted" ? normalizedStatus : "모집중",
          sortOrder: loaded.sortOrder ?? 0,
        });
        setMainPreviewUrl(loaded.thumbnail?.url || "");
        setDescriptionImages(
          (loaded.descriptionImages || [])
            .filter((image) => image.file?.url)
            .map((image, index) => ({
              id: `existing-${image.file?.id || image.link.id || index}`,
              name: image.file?.originalName || image.file?.storedName || `서브 이미지 ${index + 1}`,
              url: image.file?.url || "",
              existing: image,
            }))
        );
      } catch (loadError) {
        setError(formatCourseApiError(loadError, "과정 정보를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    };

    void loadCourse();
  }, [courseId, isEdit]);

  useEffect(() => {
    descriptionImagesRef.current = descriptionImages;
  }, [descriptionImages]);

  useEffect(() => {
    return () => {
      if (mainObjectUrlRef.current) {
        URL.revokeObjectURL(mainObjectUrlRef.current);
      }
      revokeDraftUrls(descriptionImagesRef.current);
    };
  }, []);

  const hasExistingDescriptionImages = useMemo(
    () => Boolean(course?.descriptionImages?.length),
    [course]
  );

  const updateForm = (name: keyof FormState, value: string | boolean | number) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMainImageChange = (file: File | null) => {
    if (mainObjectUrlRef.current) {
      URL.revokeObjectURL(mainObjectUrlRef.current);
      mainObjectUrlRef.current = "";
    }

    const nextUrl = file ? URL.createObjectURL(file) : course?.thumbnail?.url || "";
    if (file) {
      mainObjectUrlRef.current = nextUrl;
    }
    setMainImage(file);
    setMainPreviewUrl(nextUrl);
  };

  const handleDescriptionImagesChange = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const drafts = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Date.now()}-${Math.random()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));

    setDescriptionImages((prev) => [...prev, ...drafts]);
  };

  const removeDescriptionImage = (idToRemove: string) => {
    setDescriptionImages((prev) => {
      const removed = prev.find((draft) => draft.id === idToRemove);
      if (removed?.file) {
        URL.revokeObjectURL(removed.url);
      }

      return prev.filter((draft) => draft.id !== idToRemove);
    });
  };

  const moveDescriptionImage = (draggedId: string, targetId: string) => {
    setDescriptionImages((prev) => {
      const fromIndex = prev.findIndex((draft) => draft.id === draggedId);
      const toIndex = prev.findIndex((draft) => draft.id === targetId);
      return moveDraft(prev, fromIndex, toIndex);
    });
  };

  const handleDescriptionImageDragStart = (
    event: DragEvent<HTMLDivElement>,
    draftId: string
  ) => {
    draggedDescriptionImageIdRef.current = draftId;
    setDraggedDescriptionImageId(draftId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draftId);
  };

  const handleDescriptionImageDragEnter = (
    event: DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    event.preventDefault();
    const draggedId = draggedDescriptionImageIdRef.current || draggedDescriptionImageId;
    if (draggedId && draggedId !== targetId) {
      moveDescriptionImage(draggedId, targetId);
    }
  };

  const handleDescriptionImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggedDescriptionImageIdRef.current = "";
    setDraggedDescriptionImageId("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.courseName.trim()) {
      setError("과정명을 입력하세요.");
      return;
    }

    if (isEdit && hasExistingDescriptionImages && descriptionImages.length === 0) {
      setError("현재 백엔드는 서브 이미지를 모두 비운 저장을 지원하지 않습니다. 최소 1개를 남기거나 새 이미지를 추가하세요.");
      return;
    }

    setSaving(true);

    try {
      const descriptionFiles = (
        await Promise.all(descriptionImages.map((draft, index) => fileFromExistingImage(draft, index)))
      ).filter((file): file is File => Boolean(file));

      const saved = await saveCourse({
        id: isEdit ? courseId : 0,
        courseName: form.courseName.trim(),
        summary: form.summary,
        description: form.description,
        isVisible: form.isVisible,
        status: form.status,
        sortOrder: Number(form.sortOrder) || 0,
        mainImage,
        descriptionImages: descriptionFiles,
        descriptionImageOrders: descriptionFiles.map((_, index) => index),
      });

      navigate(`/courses/${saved.id}`);
    } catch (saveError) {
      setError(formatCourseApiError(saveError, "과정을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title={isEdit ? "과정 수정" : "과정 등록"}
      description="과정 기본 정보와 노출 상태, 메인/서브 이미지를 관리합니다."
      actions={
        <Link to={isEdit ? `/courses/${courseId}` : "/courses"}>
          <Button variant="secondary">취소</Button>
        </Link>
      }
    >
      {loading ? (
        <EmptyState title="과정 정보를 불러오는 중입니다." />
      ) : (
        <form className="course-form" onSubmit={(event) => void handleSubmit(event)}>
          {error && <p className="form-message form-message--error">{error}</p>}

          <Section title="기본 정보">
            <Card title="과정 정보">
              <div className="course-form__grid">
                <TextInput
                  label="과정명"
                  value={form.courseName}
                  onChange={(event) => updateForm("courseName", event.target.value)}
                  required
                />
                <TextInput
                  label="정렬 순서"
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm("sortOrder", Number(event.target.value))}
                />
                <label className="field">
                  <span className="field__label">상태</span>
                  <select
                    className="field__input"
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                  >
                    {COURSE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(event) => updateForm("isVisible", event.target.checked)}
                  />
                  <span>노출</span>
                </label>
              </div>

              <label className="field">
                <span className="field__label">요약</span>
                <textarea
                  className="field__input"
                  value={form.summary}
                  onChange={(event) => updateForm("summary", event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field__label">상세 설명</span>
                <textarea
                  className="field__input"
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                />
              </label>
            </Card>
          </Section>

          <Section title="메인 이미지">
            <Card title="대표 이미지">
              <label className="field">
                <span className="field__label">이미지 파일</span>
                <input
                  className="field__input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleMainImageChange(event.target.files?.[0] || null)}
                />
              </label>
              {mainPreviewUrl && (
                <div className="image-preview">
                  <p>미리보기</p>
                  <img src={mainPreviewUrl} alt="메인 이미지 미리보기" />
                </div>
              )}
            </Card>
          </Section>

          <Section title="서브 이미지">
            <Card title="상세 이미지">
              <label className="field">
                <span className="field__label">이미지 파일</span>
                <input
                  className="field__input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    handleDescriptionImagesChange(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {descriptionImages.length > 0 ? (
                <div className="image-preview-grid image-preview-grid--columns">
                  {descriptionImages.map((draft, index) => (
                    <div
                      className={`image-preview-item${
                        draggedDescriptionImageId === draft.id ? " image-preview-item--dragging" : ""
                      }`}
                      key={draft.id}
                      draggable
                      onDragStart={(event) => handleDescriptionImageDragStart(event, draft.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDragEnter={(event) => handleDescriptionImageDragEnter(event, draft.id)}
                      onDrop={handleDescriptionImageDrop}
                      onDragEnd={() => {
                        draggedDescriptionImageIdRef.current = "";
                        setDraggedDescriptionImageId("");
                      }}
                    >
                      <div className="image-preview-item__info">
                        <p>{index + 1}. {draft.name}</p>
                        <Button variant="danger" onClick={() => removeDescriptionImage(draft.id)}>
                          삭제
                        </Button>
                      </div>
                      <img src={draft.url} alt={`${draft.name} 미리보기`} draggable={false} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="선택된 서브 이미지가 없습니다." />
              )}
            </Card>
          </Section>

          <div className="course-form__actions">
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중" : "저장"}
            </Button>
            <Link to={isEdit ? `/courses/${courseId}` : "/courses"}>
              <Button variant="secondary">취소</Button>
            </Link>
          </div>
        </form>
      )}
    </Page>
  );
}
