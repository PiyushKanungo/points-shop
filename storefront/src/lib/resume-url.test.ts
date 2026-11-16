import { describe, expect, it } from "vitest";
import { isIssuedResumeUrl, resumeFolder } from "./resume-url";

const HOST = "https://abc123.public.blob.vercel-storage.com";

describe("isIssuedResumeUrl", () => {
  it("accepts this order's PDF on Vercel Blob", () => {
    expect(isIssuedResumeUrl(`${HOST}/resumes/a03xx0000001/resume-Xy12.pdf`, "a03xx0000001")).toBe(true);
    expect(resumeFolder("stub-order-3")).toBe("resumes/stub-order-3/");
  });

  it("rejects other hosts, orders, schemes and file types", () => {
    expect(isIssuedResumeUrl("https://evil.example/resumes/a03xx0000001/cv.pdf", "a03xx0000001")).toBe(false);
    expect(isIssuedResumeUrl(`${HOST}/resumes/someone-else/cv.pdf`, "a03xx0000001")).toBe(false);
    expect(isIssuedResumeUrl(`http://abc123.public.blob.vercel-storage.com/resumes/a03xx0000001/cv.pdf`, "a03xx0000001")).toBe(false);
    expect(isIssuedResumeUrl(`${HOST}/resumes/a03xx0000001/cv.exe`, "a03xx0000001")).toBe(false);
    expect(isIssuedResumeUrl("not a url", "a03xx0000001")).toBe(false);
  });
});
