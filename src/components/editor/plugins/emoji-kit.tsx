import { EmojiInputPlugin, EmojiPlugin } from "@platejs/emoji/react";

import { EmojiInputElement } from "@/components/ui/emoji-node";

const emojiMartDataPromise = import("@emoji-mart/data").then((m) => m.default);

export const EmojiKit = [
  EmojiPlugin.configure({
    options: { data: emojiMartDataPromise as any },
  }),
  EmojiInputPlugin.withComponent(EmojiInputElement),
];
