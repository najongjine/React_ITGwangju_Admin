import React from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Page,
  Section,
  StatCard,
  TextInput,
} from "../components/common";

type GuideMember = {
  id: number;
  name: string;
  role: string;
  status: string;
};

const guideMembers: GuideMember[] = [
  { id: 1, name: "김관리", role: "관리자", status: "활성" },
  { id: 2, name: "박운영", role: "운영자", status: "대기" },
];

const componentGuides = [
  {
    name: "Page",
    when: "화면 하나를 만들 때 제일 바깥에 감싸는 컴포넌트입니다. 제목, 설명, 오른쪽 버튼 자리를 잡아줍니다.",
    code: `<Page title="회원 관리" description="회원 목록을 관리합니다.">
  ...
</Page>`,
    preview: (
      <div className="guide-mini-page">
        <strong>회원 관리</strong>
        <span>회원 목록을 관리합니다.</span>
      </div>
    ),
  },
  {
    name: "Section",
    when: "한 화면 안에서 영역을 나눌 때 씁니다. 예를 들면 요약, 목록, 입력 폼 같은 덩어리입니다.",
    code: `<Section title="최근 가입자" description="오늘 가입한 회원입니다.">
  ...
</Section>`,
    preview: (
      <div className="guide-mini-section">
        <strong>최근 가입자</strong>
        <span>오늘 가입한 회원입니다.</span>
      </div>
    ),
  },
  {
    name: "Grid",
    when: "카드 여러 개를 가로로 정렬할 때 씁니다. 통계 카드나 메뉴 카드 묶음에 좋습니다.",
    code: `<Grid columns={3}>
  <Card title="카드 1" />
  <Card title="카드 2" />
  <Card title="카드 3" />
</Grid>`,
    preview: (
      <div className="guide-mini-grid">
        <span />
        <span />
        <span />
      </div>
    ),
  },
  {
    name: "Card",
    when: "관련 있는 내용을 네모 박스로 묶고 싶을 때 씁니다. 공지, 폼, 프로필, 설정 박스에 자주 씁니다.",
    code: `<Card title="공지사항" description="최근 공지입니다.">
  <p>내용</p>
</Card>`,
    preview: <Card title="공지사항" description="최근 공지입니다." />,
  },
  {
    name: "StatCard",
    when: "숫자 하나를 강조해서 보여줄 때 씁니다. 방문자 수, 회원 수, 매출, 요청 개수 같은 곳에 좋습니다.",
    code: `<StatCard label="전체 회원" value="128" hint="지난주보다 증가" />`,
    preview: <StatCard label="전체 회원" value="128" hint="지난주보다 증가" />,
  },
  {
    name: "Badge",
    when: "상태를 짧게 표시할 때 씁니다. 활성, 대기, 차단, 완료 같은 라벨에 좋습니다.",
    code: `<Badge color="green">활성</Badge>
<Badge color="red">차단</Badge>`,
    preview: (
      <div className="guide-row">
        <Badge color="green">활성</Badge>
        <Badge color="blue">대기</Badge>
        <Badge color="red">차단</Badge>
      </div>
    ),
  },
  {
    name: "Button",
    when: "사용자가 클릭해서 행동을 일으킬 때 씁니다. 저장, 취소, 삭제, 추가 버튼입니다.",
    code: `<Button>저장</Button>
<Button variant="secondary">취소</Button>
<Button variant="danger">삭제</Button>`,
    preview: (
      <div className="guide-row">
        <Button>저장</Button>
        <Button variant="secondary">취소</Button>
        <Button variant="danger">삭제</Button>
      </div>
    ),
  },
  {
    name: "TextInput",
    when: "사용자가 글자를 입력해야 할 때 씁니다. 검색어, 이름, 이메일, 제목 입력에 사용합니다.",
    code: `<TextInput label="이메일" placeholder="admin@example.com" />`,
    preview: <TextInput label="이메일" placeholder="admin@example.com" />,
  },
  {
    name: "DataTable",
    when: "DB에서 가져온 배열 데이터를 표로 보여줄 때 씁니다. 회원 목록, 게시글 목록, 주문 목록에 좋습니다.",
    code: `<DataTable
  rows={members}
  getRowKey={(member) => member.id}
  columns={[
    { key: "name", header: "이름", render: (member) => member.name },
  ]}
/>`,
    preview: (
      <DataTable
        rows={guideMembers}
        getRowKey={(member) => member.id}
        columns={[
          { key: "name", header: "이름", render: (member) => member.name },
          { key: "role", header: "권한", render: (member) => member.role },
          { key: "status", header: "상태", render: (member) => member.status },
        ]}
      />
    ),
  },
  {
    name: "EmptyState",
    when: "보여줄 데이터가 아직 없을 때 씁니다. 빈 목록, 검색 결과 없음, 준비 중 화면에 좋습니다.",
    code: `<EmptyState
  title="데이터가 없습니다"
  description="첫 데이터를 만들어보세요."
/>`,
    preview: <EmptyState title="데이터가 없습니다" description="첫 데이터를 만들어보세요." />,
  },
];

const ComponentGuide: React.FC = () => {
  return (
    <Page
      title="컴포넌트 도감"
      description="각 컴포넌트가 실제로 어떻게 보이고, 어느 상황에 쓰는지 한 번에 보는 페이지입니다."
      actions={<Button variant="secondary">예시 페이지</Button>}
    >
      <Section
        title="기본 조립 순서"
        description="대부분의 화면은 이 순서로 만들면 됩니다."
      >
        <div className="guide-flow">
          <div>Page</div>
          <span>→</span>
          <div>Section</div>
          <span>→</span>
          <div>Grid</div>
          <span>→</span>
          <div>Card / Table / Form</div>
        </div>
      </Section>

      <Section title="컴포넌트별 설명">
        <div className="guide-list">
          {componentGuides.map((item) => (
            <Card key={item.name} title={item.name} description={item.when}>
              <div className="guide-card">
                <div className="guide-preview">{item.preview}</div>
                <pre className="guide-code">
                  <code>{item.code}</code>
                </pre>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </Page>
  );
};

export default ComponentGuide;
