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
      expect(result).toContain("bg-neutral-soft");
      expect(result).toContain("text-neutral-soft-foreground");
      expect(result).toContain("border-transparent");
    });

    it("should apply default variant when variant is explicitly 'default'", () => {
      const result = badgeVariants({ variant: "default" });
      expect(result).toContain("bg-neutral-soft");
      expect(result).toContain("text-neutral-soft-foreground");
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
      expect(result).toContain("bg-warning");
      expect(result).toContain("text-warning-foreground");
      expect(result).toContain("border-transparent");
    });
  });

  describe("active variant", () => {
    it("should apply active-specific classes", () => {
      const result = badgeVariants({ variant: "active" });
      expect(result).toContain("text-success");
      expect(result).toContain("border-success-soft-border");
      expect(result).toContain("bg-success/10");
    });

    it("should not include border-transparent for active variant", () => {
      const result = badgeVariants({ variant: "active" });
      expect(result).not.toContain("border-transparent");
    });
  });

  describe("inactive variant", () => {
    it("should apply inactive-specific classes", () => {
      const result = badgeVariants({ variant: "inactive" });
      // Pas `text-muted-foreground` : #9C9C9C fait 2.6 pour 1 sur blanc.
      expect(result).toContain("text-foreground/70");
      expect(result).toContain("border-border");
      expect(result).toContain("bg-muted/60");
    });

    it("should not include border-transparent for inactive variant", () => {
      const result = badgeVariants({ variant: "inactive" });
      expect(result).not.toContain("border-transparent");
    });
  });

  describe("outline variant", () => {
    // Trois ecrans la demandaient deja : les evenements d'un joueur, le box
    // d'un match non place, le classement joueur. Elle n'existait pas.
    it("should apply a neutral bordered style", () => {
      const result = badgeVariants({ variant: "outline" });
      expect(result).toContain("border-border");
      expect(result).toContain("text-foreground");
    });

    it("should keep its border visible", () => {
      const result = badgeVariants({ variant: "outline" });
      expect(result).not.toContain("border-transparent");
    });

    it("should not paint a background", () => {
      // Un badge outline se pose sur n'importe quel fond sans le masquer.
      const result = badgeVariants({ variant: "outline" });
      expect(result).not.toMatch(/\bbg-\S/);
    });
  });

  describe("paid variant", () => {
    it("should apply paid-specific classes", () => {
      const result = badgeVariants({ variant: "paid" });
      expect(result).toContain("bg-success");
      expect(result).toContain("text-success-foreground");
      expect(result).toContain("border-transparent");
    });
  });

  describe("unpaid variant", () => {
    it("should apply unpaid-specific classes", () => {
      const result = badgeVariants({ variant: "unpaid" });
      expect(result).toContain("bg-destructive");
      expect(result).toContain("text-destructive-foreground");
      expect(result).toContain("border-transparent");
    });
  });

  /*
   * Le vocabulaire de couleur de l'application vit ici, et il ne doit plus
   * contenir une seule graduation de palette. Chaque `bg-green-100` ecrit en
   * dur est une couleur que le theme sombre ne saura pas retourner, et une
   * decision de sens rendue invisible : `bg-success-soft` dit pourquoi,
   * `bg-green-100` dit seulement quoi.
   */
  describe("le vocabulaire est en tokens", () => {
    const variantes = [
      "default", "outline", "member", "visitor", "active", "inactive",
      "paid", "unpaid", "unpaidSoft", "count", "neutral",
      "warningOutline", "warningSoft", "linked", "pending",
      "approved", "rejected",
    ] as const;

    it.each(variantes)("%s n'ecrit aucune graduation de palette", (v) => {
      const result = badgeVariants({ variant: v });
      const palette = /\b(?:bg|text|border|ring)-(?:white|black|gray|slate|zinc|neutral|stone|red|green|amber|yellow|blue|orange)-\d{2,3}\b/;
      expect(result).not.toMatch(palette);
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
      expect(result).toContain("bg-neutral-soft");
      expect(result).toContain("text-neutral-soft-foreground");
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
