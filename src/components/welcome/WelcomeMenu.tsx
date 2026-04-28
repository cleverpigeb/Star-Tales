"use client";

import { useState } from "react";
import {
  welcomeMenuItems,
  mockWelcomeActionMessage,
  type WelcomeMenuId,
} from "@/mocks/welcome";
import { STAGE } from "@/config/welcome-stages";

// ── Menu + hint ───────────────────────────────────────────────────

interface WelcomeMenuProps {
  stage: number;
  skipCurrent: boolean;
}

export function WelcomeMenu({ stage, skipCurrent }: WelcomeMenuProps) {
  const [hint, setHint] = useState<string | null>(null);

  const onSelect = (id: WelcomeMenuId) =>
    setHint(mockWelcomeActionMessage(id));

  return (
    <>
      <nav
        className={`relative z-20 flex w-full flex-col items-center gap-6 font-sans transition-opacity duration-800 ${
          stage >= STAGE.MENU ? "opacity-100" : "opacity-0"
        }`}
        aria-label="主菜单"
      >
        {welcomeMenuItems.map((item, index) => (
          <div key={item.id} className="relative flex w-full max-w-[280px] justify-center">
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.id);
              }}
              className={`group relative flex items-center justify-center px-6 py-2 text-[1.25rem] font-bold tracking-[0.25em] transition-colors duration-300 hover:text-[#fde68a] focus-visible:outline-none text-[#e5e0d8]`}
              style={{
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                opacity: stage < STAGE.MENU && !skipCurrent ? 0 : 1,
              }}
            >
              {/* Base text */}
              <span className={
                stage === STAGE.MENU && !skipCurrent
                  ? "animate-text-reveal"
                  : ""
              }
              style={{
                animationDelay: stage === STAGE.MENU && !skipCurrent ? `${index * 0.25}s` : "0s"
              }}>
                {item.label}
              </span>

              {/* Fire edge overlay */}
              {stage === STAGE.MENU && !skipCurrent && (
                <span className="absolute inset-0 flex items-center justify-center animate-text-glow-mask pointer-events-none text-[#fde68a]"
                style={{
                  animationDelay: `${index * 0.25}s`,
                }}>
                  {item.label}
                </span>
              )}
              {/* Additional actual flame shapes tracking the edge */}
              {stage === STAGE.MENU && !skipCurrent && (
                <div className="absolute inset-0 pointer-events-none overflow-visible mix-blend-screen" style={{ width: '100%' }}>
                  <div className="absolute w-12 h-12 flex items-center justify-center"
                  style={{
                    animation: `flame-move-x 2s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.25}s forwards, flame-drop 0.5s ease-in ${index * 0.25 + 2.0}s forwards`,
                    opacity: 0
                  }}>
                    <div className="absolute w-8 h-8 bg-[#ea580c] rounded-full blur-md opacity-60 animate-pulse" />
                    <div className="absolute w-6 h-6 bg-gradient-to-tr from-[#fde68a] via-[#ea580c] to-transparent rounded-[50%_0_50%_50%] rotate-[-45deg] animate-flicker-flame shadow-[0_0_8px_#ea580c]" />
                    <div className="absolute w-3 h-3 bg-[#fff] rounded-[50%_0_50%_50%] rotate-[-45deg] shadow-[0_0_4px_#fde68a]" />
                  </div>
                </div>
              )}
              
              {/* Persistent little flame particles at the bottom right corner */}
              {stage >= STAGE.MENU && (
                <div 
                  className="absolute bottom-1 right-2 w-3 h-3 opacity-90 animate-fade-in pointer-events-none"
                  style={{ 
                    animationDelay: stage === STAGE.MENU && !skipCurrent ? `${index * 0.25 + 2.5}s` : "0s",
                    animationFillMode: "both"
                  }}
                >
                  <div className="absolute inset-0 border-b border-r border-[#fde68a] shadow-[0_0_6px_#ea580c]" />
                  <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-[#fde68a] animate-flicker" style={{ filter: "blur(1px) drop-shadow(0 0 4px #ea580c)" }} />
                  <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-flicker" style={{ animationDelay: "0.4s", filter: "blur(1px)" }} />
                </div>
              )}
            </button>

          </div>
        ))}
      </nav>

      <div className="absolute -bottom-16 left-0 right-0 z-20 flex justify-center">
        {hint && (
          <p
            className="text-sm font-medium tracking-wider text-[#fde68a]/90 transition-opacity duration-300"
            style={{
              textShadow:
                "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)",
            }}
            role="status"
          >
            {hint}
          </p>
        )}
      </div>
    </>
  );
}
