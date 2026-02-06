import { describe, expect, test } from "bun:test";
import figures from "@inquirer/figures";
import { error, success } from "./output.js";

describe("output", () => {
  describe("success()", () => {
    test("should format message with tick prefix", () => {
      const result = success("Operation completed");
      expect(result).toBe(`${figures.tick} Operation completed`);
    });

    test("should handle empty string", () => {
      const result = success("");
      expect(result).toBe(`${figures.tick} `);
    });

    test("should preserve special characters", () => {
      const result = success("Path: /home/user/.config/nia-vault");
      expect(result).toBe(`${figures.tick} Path: /home/user/.config/nia-vault`);
    });

    test("should preserve unicode characters", () => {
      const result = success("Saved config");
      expect(result).toBe(`${figures.tick} Saved config`);
    });

    test("should handle newlines in message", () => {
      const result = success("Line 1\nLine 2");
      expect(result).toBe(`${figures.tick} Line 1\nLine 2`);
    });

    test("should handle message with leading/trailing spaces", () => {
      const result = success("  padded message  ");
      expect(result).toBe(`${figures.tick}   padded message  `);
    });
  });

  describe("error()", () => {
    test("should format message with cross prefix", () => {
      const result = error("Something went wrong");
      expect(result).toBe(`${figures.cross} Something went wrong`);
    });

    test("should handle empty string", () => {
      const result = error("");
      expect(result).toBe(`${figures.cross} `);
    });

    test("should preserve special characters", () => {
      const result = error("Failed to read: ~/.config/nia-vault/config.json");
      expect(result).toBe(
        `${figures.cross} Failed to read: ~/.config/nia-vault/config.json`,
      );
    });

    test("should preserve unicode characters", () => {
      const result = error("Cannot connect");
      expect(result).toBe(`${figures.cross} Cannot connect`);
    });

    test("should handle newlines in message", () => {
      const result = error("Error:\nDetails here");
      expect(result).toBe(`${figures.cross} Error:\nDetails here`);
    });

    test("should handle message with leading/trailing spaces", () => {
      const result = error("  padded error  ");
      expect(result).toBe(`${figures.cross}   padded error  `);
    });
  });

  describe("cross-platform symbols", () => {
    test("tick should be a non-empty string", () => {
      expect(figures.tick).toBeDefined();
      expect(typeof figures.tick).toBe("string");
      expect(figures.tick.length).toBeGreaterThan(0);
    });

    test("cross should be a non-empty string", () => {
      expect(figures.cross).toBeDefined();
      expect(typeof figures.cross).toBe("string");
      expect(figures.cross.length).toBeGreaterThan(0);
    });
  });
});
