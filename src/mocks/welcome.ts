export type WelcomeMenuId =
  | "adventure"
  | "characters"
  | "howto"
  | "settings";

export interface WelcomeMenuItem {
  id: WelcomeMenuId;
  label: string;
}

/** 首页欢迎区菜单（纯 mock，不接真实接口） */
export const welcomeMenuItems: readonly WelcomeMenuItem[] = [
  { id: "adventure", label: "开始冒险" },
  { id: "characters", label: "角色管理" },
  { id: "howto", label: "玩法说明" },
  { id: "settings", label: "网页设置" },
] as const;

/** 模拟点击后的反馈文案（后续可替换为真实路由或接口） */
export function mockWelcomeActionMessage(id: WelcomeMenuId): string {
  const map: Record<WelcomeMenuId, string> = {
    adventure: "开始冒险（演示：尚未接入流程）",
    characters: "角色管理（演示：尚未接入流程）",
    howto: "玩法说明（演示：尚未接入流程）",
    settings: "网页设置（演示：尚未接入流程）",
  };
  return map[id];
}
