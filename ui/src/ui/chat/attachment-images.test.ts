import { describe, expect, it } from "vitest";
import {
  extractReferencedImagePaths,
  isLocalImagePath,
  normalizeLocalImagePath,
  parseMarkdownLocalImageRefs,
  stripMarkdownLocalImageRefs,
} from "./attachment-images.ts";

describe("attachment-images", () => {
  it("detects bare filename markdown image refs", () => {
    const text = "![cat.jpg](european-shorthair-8601492_1280.jpg)";
    expect(parseMarkdownLocalImageRefs(text)).toEqual([
      {
        alt: "cat.jpg",
        path: "attachments/european-shorthair-8601492_1280.jpg",
      },
    ]);
  });

  it("normalizes attachments paths", () => {
    expect(normalizeLocalImagePath("foo.png")).toBe("attachments/foo.png");
    expect(normalizeLocalImagePath("attachments/bar.webp")).toBe("attachments/bar.webp");
  });

  it("rejects remote image urls", () => {
    expect(isLocalImagePath("https://example.com/a.png")).toBe(false);
    expect(isLocalImagePath("data:image/png;base64,abc")).toBe(false);
  });

  it("strips local markdown image syntax from text", () => {
    const text = "找到啦！\n\n![cat.jpg](cat.jpg)\n\n**图片信息**";
    expect(stripMarkdownLocalImageRefs(text)).toBe("找到啦！\n\n**图片信息**");
  });

  it("extracts referenced image paths from assistant text", () => {
    const text = "保存到 attachments/kitten.jpeg 并展示 ![kitten](kitten.jpeg)";
    expect(extractReferencedImagePaths(text)).toEqual([
      "attachments/kitten.jpeg",
    ]);
  });

  it("does not treat bare filenames in directory listings as attachment paths", () => {
    const text =
      "attachments 目录内容如下：\ncute_cat.jpg cute_kitten.jpg report.html";
    expect(extractReferencedImagePaths(text)).toEqual([]);
  });
});
