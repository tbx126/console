import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名的工具函数
 * 使用 clsx 处理条件类名，使用 twMerge 解决 Tailwind 类名冲突
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
