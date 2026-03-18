import { BaseCaptionPlugin } from "@platejs/caption";
import { CaptionPlugin } from "@platejs/caption/react";
import {
  BaseAudioPlugin,
  BaseFilePlugin,
  BaseImagePlugin,
  BaseMediaEmbedPlugin,
  BasePlaceholderPlugin,
  BaseVideoPlugin,
} from "@platejs/media";
import {
  AudioPlugin,
  FilePlugin,
  ImagePlugin,
  MediaEmbedPlugin,
  PlaceholderPlugin,
  VideoPlugin,
} from "@platejs/media/react";
import { KEYS } from "platejs";

import { AudioElement } from "@/components/ui/media-audio-node";
import { AudioElementStatic } from "@/components/ui/media-audio-node-static";
import { MediaEmbedElement } from "@/components/ui/media-embed-node";
import { FileElement } from "@/components/ui/media-file-node";
import { FileElementStatic } from "@/components/ui/media-file-node-static";
import { ImageElement } from "@/components/ui/media-image-node";
import { ImageElementStatic } from "@/components/ui/media-image-node-static";
import { PlaceholderElement } from "@/components/ui/media-placeholder-node";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";
import { MediaUploadToast } from "@/components/ui/media-upload-toast";
import { VideoElement } from "@/components/ui/media-video-node";
import { VideoElementStatic } from "@/components/ui/media-video-node-static";

// ── Interactive plugins ──────────────────────────────────────────────

export const MediaKit = [
  ImagePlugin.configure({
    options: { disableUploadInsert: true },
    render: { afterEditable: MediaPreviewDialog, node: ImageElement },
  }),
  MediaEmbedPlugin.withComponent(MediaEmbedElement),
  VideoPlugin.withComponent(VideoElement),
  AudioPlugin.withComponent(AudioElement),
  FilePlugin.withComponent(FileElement),
  PlaceholderPlugin.configure({
    options: { disableEmptyPlaceholder: true },
    render: { afterEditable: MediaUploadToast, node: PlaceholderElement },
  }),
  CaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
];

// ── Static/SSR plugins ───────────────────────────────────────────────

export const BaseMediaKit = [
  BaseImagePlugin.withComponent(ImageElementStatic),
  BaseVideoPlugin.withComponent(VideoElementStatic),
  BaseAudioPlugin.withComponent(AudioElementStatic),
  BaseFilePlugin.withComponent(FileElementStatic),
  BaseCaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
  BaseMediaEmbedPlugin,
  BasePlaceholderPlugin,
];
