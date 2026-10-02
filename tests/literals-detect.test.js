import { describe, expect, it } from "vitest";
import {
  codeLiterals,
  inlineViolations,
  styleAttrs,
  styleColourLiterals,
} from "./literals.js";

// The literal test is only as good as its detectors.

describe("codeLiterals", () => {
  it("finds hex and px in CSS", () => {
    expect(codeLiterals(".a{color:#121110;padding:0 24px;top:-7px;b:.5px}")).toEqual({
      hex: ["#121110"],
      px: ["24px", "-7px", ".5px"],
    });
  });
  it("finds px in JS strings", () => {
    expect(codeLiterals("el.style.setProperty('--mx', x + 'px'); const r = '0px';").px).toEqual([
      "0px",
    ]);
    expect(codeLiterals("const s = (n).toFixed(1) + 'px';").px).toEqual([]);
  });
  it("ignores comments, tokens and units that are not px", () => {
    expect(
      codeLiterals("/* 16px #fff */\n// 12px\n.a{width:var(--frame-bezel);height:5cqw;b:2em}"),
    ).toEqual({ hex: [], px: [] });
  });
  it("does not read a px inside a name as a literal", () => {
    expect(codeLiterals(".x{--gap-12px:var(--a);}").px).toEqual([]);
  });
});

describe("styleColourLiterals", () => {
  it("passes tokens and transparent", () => {
    expect(
      styleColourLiterals(
        "background: linear-gradient(90deg, transparent, var(--horizon) 80px); color: var(--ink)",
      ),
    ).toEqual([]);
  });
  it("fails hex and colour functions", () => {
    expect(styleColourLiterals("color: #fff; background: rgba(0,0,0,.1); fill: oklch(0.7 0.1 40)"))
      .toHaveLength(3);
  });
  it("reads both quote styles", () => {
    expect(styleAttrs(`<a style="color: #000"></a><b style='top: 1px'></b>`)).toEqual([
      "color: #000",
      "top: 1px",
    ]);
  });
});

describe("inlineViolations", () => {
  it("passes external scripts and style attributes", () => {
    expect(
      inlineViolations(`<script src="/head.js"></script><div style="top: 1px"></div>`),
    ).toEqual([]);
  });
  it("fails style blocks, inline scripts and handlers", () => {
    expect(
      inlineViolations(`<style>a{}</style><script>x()</script><button onclick="y()"></button>`),
    ).toEqual(["<style> block", "inline <script>", "onclick= handler"]);
  });
});
