"use client";

export function autoGrowTextarea(el: HTMLTextAreaElement, maxHeight = 160) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
}
