"use client";

import { useBackgroundPreload } from "@/hooks/useBackgroundPreload";
import { useStageTimeline } from "@/hooks/useStageTimeline";
import { useParchmentTexture } from "@/hooks/useParchmentTexture";
import { WelcomePanel } from "@/components/welcome/WelcomePanel";
import { STAGE, stageClass } from "@/config/welcome-stages";
import "./welcome.css";

export default function Home() {
  const { bgSrc, isLoaded: isReady } = useBackgroundPreload();
  const { stage, skipCurrent, handleSkip } = useStageTimeline(isReady);
  const { canvasRef, refCallback } = useParchmentTexture();

  const unrollCls =
    stage === STAGE.UNROLL && isReady
      ? skipCurrent
        ? "unroll-complete"
        : "animate-unroll"
      : stage > STAGE.UNROLL
        ? "unroll-complete"
        : "hidden";

  const overlayCls = stageClass(
    stage,
    STAGE.ATMOSPHERE,
    skipCurrent,
    "animate-fade-in",
    "opacity-100",
    "opacity-0",
  );

  const scrollVisible = stage === STAGE.UNROLL && isReady && !skipCurrent;

  return (
    <main
      className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden select-none"
      onClick={handleSkip}
    >
      {/* Full-screen parchment texture (bottommost layer) */}
      <canvas
        ref={refCallback}
        className="absolute inset-0 -z-20 h-full w-full"
        aria-hidden
      />

      {/* Fantasy gradient fallback (portrait / image-load-failure) */}
      <div
        className={`fantasy-page-root absolute inset-0 -z-10 ${unrollCls}`}
        aria-hidden
      />

      {/* Landscape background image */}
      <div
        className={`absolute inset-0 z-0 hidden bg-cover bg-center bg-no-repeat landscape:block ${unrollCls}`}
        style={bgSrc ? { backgroundImage: `url(${bgSrc})` } : undefined}
        aria-hidden
      />

      {/* Scroll sprite overlay */}
      <div
        className={`scroll-wrapper ${scrollVisible ? "animate-scroll" : "hidden"}`}
        aria-hidden
      >
        <div className="scroll-frame" />
      </div>

      {/* Atmosphere overlays */}
      <div
        className={`pointer-events-none absolute inset-0 z-[2] bg-black/20 backdrop-blur-[6px] transition-opacity duration-800 ${overlayCls}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_85%_75%_at_50%_50%,transparent_0%,rgba(0,0,0,0.75)_100%)] transition-opacity duration-800 ${overlayCls}`}
        aria-hidden
      />

      {isReady && (
        <WelcomePanel
          parchmentCanvasRef={canvasRef}
          stage={stage}
          skipCurrent={skipCurrent}
        />
      )}
    </main>
  );
}
