import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  descriptionSchema,
  generateMockFormSchema,
  taskFormSchema,
  titleSchema,
} from "./schemas";

describe("titleSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(titleSchema.parse("  Buy bread  ")).toBe("Buy bread");
  });

  it("accepts the maximum length and rejects one more character", () => {
    expect(titleSchema.safeParse("a".repeat(TITLE_MAX)).success).toBe(true);
    expect(titleSchema.safeParse("a".repeat(TITLE_MAX + 1)).success).toBe(false);
  });

  it("accepts accents and emoji", () => {
    expect(titleSchema.safeParse("Ação de revisão 🚀").success).toBe(true);
  });

  it.each(["\u0000", "\u0007", "\u001B", "\u007F"])("rejects control character %j", (char) => {
    expect(titleSchema.safeParse(`abc${char}`).success).toBe(false);
  });
});

describe("descriptionSchema", () => {
  it("allows line breaks and tabs", () => {
    expect(descriptionSchema.safeParse("line 1\nline\t2").success).toBe(true);
  });

  it("rejects control characters and excessive length", () => {
    expect(descriptionSchema.safeParse("ok\u0001").success).toBe(false);
    expect(descriptionSchema.safeParse("a".repeat(DESCRIPTION_MAX + 1)).success).toBe(false);
  });
});

describe("taskFormSchema", () => {
  it("requires a title", () => {
    const result = taskFormSchema.safeParse({ title: "   ", description: "", completed: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toEqual(["Title is required"]);
    }
  });
});

describe("generateMockFormSchema", () => {
  it("coerces the quantity from text", () => {
    const result = generateMockFormSchema.safeParse({ count: "25", seed: "" });
    expect(result.success).toBe(true);
  });

  it("rejects quantities out of range", () => {
    expect(generateMockFormSchema.safeParse({ count: "0", seed: "" }).success).toBe(false);
    expect(generateMockFormSchema.safeParse({ count: "501", seed: "" }).success).toBe(false);
  });

  it("rejects a seed that is not digits", () => {
    expect(generateMockFormSchema.safeParse({ count: "5", seed: "abc" }).success).toBe(false);
  });
});
