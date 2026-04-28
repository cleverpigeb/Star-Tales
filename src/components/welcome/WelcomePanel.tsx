"use client";

import { STAGE, stageClass } from "@/config/welcome-stages";
import { ParchmentBurn } from "./ParchmentBurn";
import { TitleScene } from "./TitleScene";
import { WelcomeMenu } from "./WelcomeMenu";

interface WelcomePanelProps {
  parchmentCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stage: number;
  skipCurrent: boolean;
}

export function WelcomePanel({
  parchmentCanvasRef,
  stage,
  skipCurrent,
}: WelcomePanelProps) {
  const headerCls = stageClass(
    stage,
    STAGE.ATMOSPHERE,
    skipCurrent,
    "animate-fade-in",
    "opacity-100",
    "opacity-0",
  );

  return (
    <section
      className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center text-center gap-16 md:gap-24"
      aria-labelledby="welcome-title"
    >
      <ParchmentBurn
        parchmentCanvasRef={parchmentCanvasRef}
        stage={stage}
        skipCurrent={skipCurrent}
      />

      <header
        className={`flex flex-col items-center justify-center transition-opacity duration-800 ${headerCls}`}
      >
        <TitleScene stage={stage} skipCurrent={skipCurrent} />
      </header>

      <WelcomeMenu stage={stage} skipCurrent={skipCurrent} />
    </section>
  );
}
