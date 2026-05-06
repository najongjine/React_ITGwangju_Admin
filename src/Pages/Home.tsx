import React from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Grid,
  Page,
  Section,
  StatCard,
  TextInput,
} from "../components/common";

type Member = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "blocked";
};

const members: Member[] = [
  {
    id: 1,
    name: "김관리",
    email: "admin@example.com",
    role: "관리자",
    status: "active",
  },
  {
    id: 2,
    name: "박운영",
    email: "manager@example.com",
    role: "운영자",
    status: "pending",
  },
  {
    id: 3,
    name: "이사용",
    email: "user@example.com",
    role: "사용자",
    status: "blocked",
  },
];

const statusText = {
  active: "활성",
  pending: "대기",
  blocked: "차단",
};

const statusColor = {
  active: "green",
  pending: "blue",
  blocked: "red",
} as const;

const Home: React.FC = () => {
  return (
    <Page
      title="관리자 대시보드"
      description="아래 컴포넌트들은 props로 내용만 바꿔 사용할 수 있습니다. 지금은 샘플 배열에 연결되어 있고, 나중에는 DB에서 받아온 데이터로 교체하면 됩니다."
      actions={<Button>항목 추가</Button>}
    >
      <Section title="요약">
        <Grid columns={3}>
          <StatCard label="전체 회원" value="128" hint="지난주보다 12명 증가" />
          <StatCard label="대기 요청" value="7" hint="확인이 필요한 항목" />
          <StatCard label="오늘 방문" value="432" hint="실시간 집계 예시" />
        </Grid>
      </Section>

      <Section
        title="기본 카드"
        description="제목, 설명, 내용만 넣으면 되는 가장 단순한 박스입니다."
      >
        <Grid columns={2}>
          <Card title="공지 사항" description="최근 공지와 안내 문구를 넣는 자리">
            <p>DB에서 불러온 공지 내용을 여기에 출력하면 됩니다.</p>
            <Button variant="secondary">자세히 보기</Button>
          </Card>
          <Card title="검색" description="입력 컴포넌트 예시">
            <TextInput label="검색어" placeholder="이름 또는 이메일 입력" />
          </Card>
        </Grid>
      </Section>

      <Section
        title="목록 테이블"
        description="rows 배열만 DB 데이터로 바꾸면 그대로 사용할 수 있습니다."
      >
        <DataTable
          rows={members}
          getRowKey={(member) => member.id}
          columns={[
            { key: "name", header: "이름", render: (member) => member.name },
            { key: "email", header: "이메일", render: (member) => member.email },
            { key: "role", header: "권한", render: (member) => member.role },
            {
              key: "status",
              header: "상태",
              render: (member) => (
                <Badge color={statusColor[member.status]}>{statusText[member.status]}</Badge>
              ),
            },
          ]}
        />
      </Section>

      <Section title="빈 화면">
        <EmptyState
          title="아직 데이터가 없습니다"
          description="목록이 비어 있을 때 보여줄 화면입니다."
          action={<Button variant="secondary">첫 데이터 만들기</Button>}
        />
      </Section>
    </Page>
  );
};

export default Home;
