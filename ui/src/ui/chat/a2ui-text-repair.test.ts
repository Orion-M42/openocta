import { describe, expect, it } from "vitest";
import { repairListingBody, repairTextPresentation } from "./a2ui-text-repair.ts";

describe("repairTextPresentation", () => {
  it("splits collapsed ls -alh output inside a malformed fence", () => {
    const body =
      "total 504 drwxr-x---@ 18 zhanbei staff 576B Jun 12 11:30 . drwx------@ 14 zhanbei staff 448B Jun 11 21:24 ..";
    const input = "命令已执行：`ls -alh` 输出如下：\n```text " + body + " ```";
    const got = repairTextPresentation(input);
    expect(got).toContain("```text\ntotal 504\n");
    expect(got).toContain("drwxr-x---@ 18 zhanbei staff 576B Jun 12 11:30 .");
    expect(got).not.toContain("total 504 drwxr-x---@");
  });

  it("preserves already multiline ls output", () => {
    const input = "```text\nline1\nline2\n```";
    expect(repairTextPresentation(input)).toBe(input);
  });

  it("inserts a blank line before a glued opening fence", () => {
    const input = "输出如下：```text\nline1\n```";
    const got = repairTextPresentation(input);
    expect(got).toContain("输出如下：\n\n```text");
  });

  it("splits plain filename listings", () => {
    const body =
      "attachments bing.html bing2.html inspection-report prompt redis-cache search_boss.py";
    const input = "```text " + body + " ```";
    const got = repairTextPresentation(input);
    expect(got).toContain("attachments\nbing.html");
  });
});

describe("repairListingBody", () => {
  it("splits ls entries without breaking permission columns", () => {
    const body = "total 504 drwxr-x---@ 18 zhanbei staff 576B Jun 12 11:30 .";
    const got = repairListingBody(body);
    expect(got.split("\n")).toHaveLength(2);
    expect(got.startsWith("total 504")).toBe(true);
  });
});
