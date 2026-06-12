import { describe, expect, it } from "vitest";
import { extractA2UITextMarkdown } from "./a2ui-bridge.ts";

describe("extractA2UITextMarkdown", () => {
  it("returns repaired markdown for text-only A2UI surfaces", () => {
    const body =
      "total 504 drwxr-x---@ 18 zhanbei staff 576B Jun 12 11:30 . drwx------@ 14 zhanbei staff 448B Jun 11 21:24 ..";
    const blocks = [
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "cmd-out",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["text1"],
            },
            {
              id: "text1",
              component: "Text",
              text: "命令已执行：`ls -alh`，输出如下：\n```text " + body + " ```",
            },
          ],
        },
      },
    ];
    const got = extractA2UITextMarkdown(blocks);
    expect(got).toContain("```text\ntotal 504\n");
    expect(got).toContain("drwxr-x---@ 18 zhanbei staff 576B Jun 12 11:30 .");
  });

  it("returns null when interactive components are present", () => {
    const blocks = [
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "confirm",
          components: [
            { id: "root", component: "Column", children: ["text1", "btn1"] },
            { id: "text1", component: "Text", text: "Run `ls`?" },
            { id: "btn1", component: "Button", child: "text2", action: { name: "ok" } },
            { id: "text2", component: "Text", text: "Confirm" },
          ],
        },
      },
    ];
    expect(extractA2UITextMarkdown(blocks)).toBeNull();
  });
});
