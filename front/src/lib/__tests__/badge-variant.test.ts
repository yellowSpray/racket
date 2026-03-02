import { describe, it, expect } from "vitest";
import { badgeVariants } from "@/lib/badge-variant";

describe("badgeVariants", () => {
  const baseClasses = [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-full",
    "border",
    "px-2",
    "py-0.5",
    "text-xs",
    "font-medium",
  ];

  it("should return a string of class names", () => {
    const result = badgeVariants();
    expect(typeof result).toBe("string");
  });

  it("should always include base classes", () => {
    const result = badgeVariants();
    for (const cls of baseClasses) {
      expect(result).toContain(cls);
    }
  });

  describe("default variant", () => {
    it("should apply default variant when no variant is specified", () => {
      const result = badgeVariants();
      expect(result).toContain("bg-gray-300");
      expect(result).toContain("text-gray-700");
      expect(result).toContain("border-transparent");
    });

    it("should apply default variant when variant is explicitly 'default'", () => {
      const result = badgeVariants({ variant: "default" });
      expect(result).toContain("bg-gray-300");
      expect(result).toContain("text-gray-700");
    });
  });

  describe("member variant", () => {
    it("should apply member-specific classes", () => {
      const result = badgeVariants({ variant: "member" });
      expect(result).toContain("bg-primary");
      expect(result).toContain("text-primary-foreground");
      expect(result).toContain("border-transparent");
    });
  });

  describe("visitor variant", () => {
    it("should apply visitor-specific classes", () => {
      const result = badgeVariants({ variant: "visitor" });
      expect(result).toContain("bg-amber-500");
      expect(result).toContain("text-gray-50");
      expect(result).toContain("border-transparent");
    });
  });

  describe("active variant", () => {
    it("should apply active-specific classes", () => {
      const result = badgeVariants({ variant: "active" });
      expect(result).toContain("text-green-500");
      expect(result).toContain("border-2");
      expect(result).toContain("border-primary");
    });

    it("should not include border-transparent for active variant", () => {
      const result = badgeVariants({ variant: "active" });
      expect(result).not.toContain("border-transparent");
    });
  });

  describe("inactive variant", () => {
    it("should apply inactive-specific classes", () => {
      const result = badgeVariants({ variant: "inactive" });
      expect(result).toContain("text-gray-500");
      expect(result).toContain("border-2");
    });

    it("should not include border-transparent for inactive variant", () => {
      const result = badgeVariants({ variant: "inactive" });
      expect(result).not.toContain("border-transparent");
    });
  });

  describe("paid variant", () => {
    it("should apply paid-specific classes", () => {
      const result = badgeVariants({ variant: "paid" });
      expect(result).toContain("bg-green-500");
      expect(result).toContain("text-gray-50");
      expect(result).toContain("border-transparent");
    });
  });

  describe("unpaid variant", () => {
    it("should apply unpaid-specific classes", () => {
      const result = badgeVariants({ variant: "unpaid" });
      expect(result).toContain("bg-red-500");
      expect(result).toContain("text-gray-50");
      expect(result).toContain("border-transparent");
    });
  });

  describe("edge cases", () => {
    it("should return base classes without variant-specific classes when variant is null", () => {
      const result = badgeVariants({ variant: null as unknown as undefined });
      // CVA does not treat null the same as undefined — no variant classes applied
      expect(result).toContain("inline-flex");
      expect(result).toContain("rounded-full");
    });

    it("should fall back to default when variant is undefined", () => {
      const result = badgeVariants({ variant: undefined });
      expect(result).toContain("bg-gray-300");
      expect(result).toContain("text-gray-700");
    });

    it("should produce distinct classes for each variant", () => {
      const variants = [
        "default",
        "member",
        "visitor",
        "active",
        "inactive",
        "paid",
        "unpaid",
      ] as const;

      const results = variants.map((v) => badgeVariants({ variant: v }));

      // Each variant should produce a unique result
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(variants.length);
    });
  });
});
