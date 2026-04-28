"use client";

import { useEffect, useRef } from "react";
import { STAGE } from "@/config/welcome-stages";

// ── Static comet data (deterministic, generated once) ─────────────

const COMET_COUNT = 80;
const CANVAS_SIZE = 2000;
const TRAIL_LENGTH = 70;
const COLORS = ["#ffffff", "#93c5fd", "#fde68a", "#ffffff", "#bae6fd"];

interface CometSeed {
  angle: number;
  distance: number;
  size: number;
  burstDelay: number;
  burstDuration: number;
  orbitDuration: number;
  color: string;
}

const COMETS: CometSeed[] = Array.from({ length: COMET_COUNT }, (_, i) => {
  const angle = (i * 137.5) % 360;
  const distance = 150 + ((i * 93) % 350);
  const isLarge = (i * 29) % 100 < 15;
  const size = isLarge
    ? 4.5 + ((i * 13) % 3.5)
    : 1.5 + ((i * 17) % 2.5);
  const burstDelay = ((i * 37) % 1500) / 1000;
  const burstDuration = 1.5 + distance / 400 + ((i * 23) % 500) / 1000;
  const orbitDuration = 10 + ((i * 43) % 25);
  const color = COLORS[i % COLORS.length];
  return { angle, distance, size, burstDelay, burstDuration, orbitDuration, color };
});

function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

// ── Component ─────────────────────────────────────────────────────

interface CometCanvasProps {
  stage: number;
  skipCurrent: boolean;
}

export function CometCanvas({ stage, skipCurrent }: CometCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(stage);
  const skipRef = useRef(skipCurrent);
  const burstSkippedRef = useRef(false);

  useEffect(() => {
    stageRef.current = stage;
    skipRef.current = skipCurrent;
  }, [stage, skipCurrent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    let animId: number;
    let lastTime = performance.now();
    let tGlobal = 0;

    const active = COMETS.map((c) => ({
      ...c,
      history: [] as { x: number; y: number }[],
      orbitAngle: 0,
      currentOrbitSpeed: (Math.PI * 2) / c.orbitDuration,
      targetOrbitSpeed: (Math.PI * 2) / c.orbitDuration,
      lastSpeedChange: performance.now() + Math.random() * 5000,
    }));

    function render() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (stageRef.current >= STAGE.STARBURST) {
        if (
          stageRef.current === STAGE.STARBURST &&
          skipRef.current &&
          !burstSkippedRef.current
        ) {
          tGlobal = Math.max(tGlobal, 3.5);
          burstSkippedRef.current = true;
          active.forEach((c) => (c.history = []));
        } else {
          tGlobal += dt;
        }

        for (const comet of active) {
          const t = tGlobal - comet.burstDelay;
          if (t < 0) continue;

          if (t > comet.burstDuration) {
            if (now - comet.lastSpeedChange > 2000 && Math.random() < 0.02) {
              comet.targetOrbitSpeed =
                (Math.PI * 2) / (6 + Math.random() * 30);
              comet.lastSpeedChange = now;
            }
            comet.currentOrbitSpeed +=
              (comet.targetOrbitSpeed - comet.currentOrbitSpeed) * dt * 0.5;
          }

          const burstP = Math.min(t / comet.burstDuration, 1);
          const easeP = easeOutQuart(burstP);
          const currentDist = easeP * comet.distance;
          const dropY = easeP * 180;

          if (t > 0.3) comet.orbitAngle += comet.currentOrbitSpeed * dt;

          const baseAngle = (comet.angle * Math.PI) / 180;
          const totalAngle = baseAngle - comet.orbitAngle;
          const x = cx + currentDist * Math.cos(totalAngle);
          const y = cy + dropY + currentDist * Math.sin(totalAngle);

          // "Burn out" logic: fade out and disappear after 5 seconds of rotation
          let cometAlpha = 1.0;
          let headX = x;
          let headY = y;
          let headColor = comet.color;
          let headSize = comet.size;
          let isBurningOut = false;
          let drawHead = true;
          
          const rotateTime = t - 0.3;
          const burnoutDuration = 0.5;
          if (rotateTime > 5.0) {
            isBurningOut = true;
            const burnoutProgress = (rotateTime - 5.0) / burnoutDuration;
            
            // Keep head stationary at its position at t = 5.3 (which means rotateTime = 5.0)
            const frozenOrbitAngle = comet.orbitAngle - comet.currentOrbitSpeed * (rotateTime - 5.0);
            const frozenTotalAngle = baseAngle - frozenOrbitAngle;
            headX = cx + currentDist * Math.cos(frozenTotalAngle);
            headY = cy + dropY + currentDist * Math.sin(frozenTotalAngle);
            
            // Color head red and make it glow larger like a spark
            headColor = "#ef4444";
            headSize = comet.size * (1.5 + Math.sin(burnoutProgress * Math.PI) * 1.5);
            
            if (burnoutProgress >= 1.0) {
              cometAlpha = 0;
            } else {
              cometAlpha = 1.0 - burnoutProgress;
            }
            
            if (burnoutProgress > 0.8) {
              drawHead = false;
            }
          }
          
          if (cometAlpha <= 0) continue;

          // Only push the actual moving position to the history if not fully burnt out
          if (isBurningOut) {
            comet.history.push({ x: headX, y: headY });
          } else {
            comet.history.push({ x, y });
          }
          if (comet.history.length > TRAIL_LENGTH) comet.history.shift();

          // During burnout, speed up trail shrinking by removing items faster
          if (isBurningOut) {
            const itemsToRemove = 4; // pop 4 tail segments per frame to quickly catch up
            for (let k = 0; k < itemsToRemove && comet.history.length > 0; k++) {
              comet.history.shift();
            }
          }

          // Draw trail
          if (comet.history.length > 1) {
            ctx!.lineCap = "round";
            for (let i = 0; i < comet.history.length - 1; i++) {
              ctx!.beginPath();
              ctx!.moveTo(comet.history[i].x, comet.history[i].y);
              ctx!.lineTo(comet.history[i + 1].x, comet.history[i + 1].y);
              ctx!.strokeStyle = comet.color;
              ctx!.lineWidth = comet.size * 0.85;
              ctx!.globalAlpha = Math.pow(
                i / (comet.history.length - 1),
                2,
              ) * cometAlpha;
              ctx!.stroke();
            }
            ctx!.globalAlpha = 1.0;
          }

          // Draw head
          if (drawHead) {
            ctx!.globalAlpha = cometAlpha;
            ctx!.beginPath();
            ctx!.arc(headX, headY, headSize / 2, 0, Math.PI * 2);
            ctx!.fillStyle = headColor;
            ctx!.shadowBlur = headSize * 3;
            ctx!.shadowColor = headColor;
            ctx!.fill();
            ctx!.shadowBlur = 0;
            ctx!.globalAlpha = 1.0;
          }
        }
      }

      animId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${
        stage >= STAGE.STARBURST ? "opacity-100" : "opacity-0"
      }`}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
    />
  );
}
