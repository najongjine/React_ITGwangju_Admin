import React from "react";
import { Card, EmptyState, Page, Section } from "../components/common";

const Maze: React.FC = () => {
  return (
    <Page title="미로" description="게임이나 실험용 화면을 붙일 자리입니다.">
      <Section>
        <Card title="미로 게임">
          <EmptyState
            title="미로 기능 준비 중"
            description="캔버스 게임 컴포넌트를 만든 뒤 이 카드 안에 넣으면 됩니다."
          />
        </Card>
      </Section>
    </Page>
  );
};

export default Maze;
