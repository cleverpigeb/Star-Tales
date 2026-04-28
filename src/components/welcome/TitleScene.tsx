import { STAGE, stageClass } from "@/config/welcome-stages";
import { SwordSVG } from "./SwordSVG";
import { CometCanvas } from "./CometCanvas";

// ── Title word with layered shadow / glow / fill ──────────────────

interface TitleWordProps {
  text: string;
  className: string;
  blurGradient: string;
  mainGradient: string;
}

function TitleWord({
  text,
  className,
  blurGradient,
  mainGradient,
}: TitleWordProps) {
  return (
    <span className={className}>
      <span
        className="absolute left-0 top-0 select-none text-black"
        style={{
          filter: "blur(8px)",
          opacity: 0.9,
          transform: "translateY(6px)",
          WebkitTextStroke: "4px black",
        }}
      >
        {text}
      </span>
      <span
        className={`absolute left-0 top-0 select-none ${blurGradient} bg-clip-text text-transparent`}
        style={{
          filter: "blur(8px)",
          opacity: 0.6,
          WebkitTextStroke: "4px transparent",
        }}
      >
        {text}
      </span>
      <span
        className={`relative ${mainGradient} bg-clip-text text-transparent`}
        style={{ WebkitTextStroke: "1.5px #d4af37" }}
      >
        {text}
      </span>
    </span>
  );
}

// ── Title scene (h1 + sword + effects) ────────────────────────────

interface TitleSceneProps {
  stage: number;
  skipCurrent: boolean;
}

export function TitleScene({ stage, skipCurrent }: TitleSceneProps) {
  const swordCls = stageClass(
    stage, STAGE.SWORD, skipCurrent,
    "animate-sword", "sword-inserted", "opacity-0",
  );
  const splitStarCls = stageClass(
    stage, STAGE.SWORD, skipCurrent,
    "animate-split-star", "split-star-done",
  );
  const splitTalesCls = stageClass(
    stage, STAGE.SWORD, skipCurrent,
    "animate-split-tales", "split-tales-done",
  );
  const slashCls = stageClass(
    stage, STAGE.SWORD, skipCurrent,
    "animate-slash", "slash-done",
  );
  const magicCls = stageClass(
    stage, STAGE.SWORD, skipCurrent,
    "animate-magic-circle", "magic-circle-done",
  );

  return (
    <div className="title-scene">
      <h1
        id="welcome-title"
        className="title-row font-[family-name:var(--font-great-vibes)] text-[5.5rem] font-normal leading-none tracking-[0.02em] sm:text-[7.5rem]"
        style={{ isolation: "isolate" }}
      >
        <span className={`title-magic-circle ${magicCls}`} />

        <span className="comets-origin relative">
          <CometCanvas stage={stage} skipCurrent={skipCurrent} />
        </span>

        <TitleWord
          text="Star"
          className={`title-word-star relative z-10 ${splitStarCls}`}
          blurGradient="bg-gradient-to-r from-[#fffff0] from-30% via-[#22c55e] via-80% to-[#15803d]"
          mainGradient="bg-gradient-to-r from-white from-30% via-[#3b82f6] via-80% to-[#1e40af]"
        />

        <span className={`title-slash ${slashCls}`} />

        <span className="title-sword-slot">
          <SwordSVG className={swordCls} />
        </span>

        <TitleWord
          text="Tales"
          className={`title-word-tales relative z-30 ${splitTalesCls}`}
          blurGradient="bg-gradient-to-r from-[#15803d] from-30% via-[#ef4444] via-80% to-[#b91c1c]"
          mainGradient="bg-gradient-to-r from-[#1e40af] from-30% via-[#9333ea] via-80% to-[#4c1d95]"
        />
      </h1>
    </div>
  );
}
