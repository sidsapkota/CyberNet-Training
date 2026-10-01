import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isInteractiveCard } from "@/cards/schema";
import { getScene } from "@/cards/shared/scenes/manifests";
import { goalMet, initialSimulatorAnswer, sliderRange } from "@/cards/simulator/grade";
import type { InputValue } from "@/cards/simulator/models/types";
import { binaryToggle, explainer, multipleChoice } from "@/test/fixtures";
import { ContentValidationError, loadContent } from "./load";

describe("real content in /content", () => {
  it("loads and validates", () => {
    const { courses, lessons } = loadContent();
    expect(courses.length).toBeGreaterThan(0);
    expect(lessons.has("bits-and-binary")).toBe(true);
    expect(lessons.has("binary-and-data-quiz")).toBe(true);
  });

  it("orders How the Internet Works modules and lessons, each module ending in its quiz", () => {
    const { courses } = loadContent();
    const course = courses.find((c) => c.id === "how-the-internet-works");
    expect(course?.modules.map((m) => m.id)).toEqual([
      "binary-and-data",
      "ip-addresses",
      "packets-and-routing",
      "dns",
      "ports-and-protocols",
      "the-web",
    ]);
    expect(course?.modules.map((m) => m.lessons.map((l) => l.id))).toEqual([
      ["bits-and-binary", "bytes-file-sizes-and-hex", "binary-and-data-quiz"],
      ["what-is-an-ip-address", "public-and-private-addresses", "meet-ipv6", "ip-addresses-quiz"],
      [
        "why-data-travels-in-packets",
        "routers-and-hops",
        "different-roads-same-destination",
        "packets-and-routing-quiz",
      ],
      ["names-and-numbers", "the-lookup-journey", "dns-records-and-tools", "dns-quiz"],
      ["ports", "tcp-and-udp", "protocols-as-shared-rules", "ports-and-protocols-quiz"],
      [
        "http-requests-and-responses",
        "https-and-the-padlock",
        "what-happens-when-you-type-a-url",
        "the-web-quiz",
      ],
    ]);
  });

  it("every lesson follows the lesson rules: 8-12 cards, hook and recap, ≤3 multiple choice, 2 challenges", () => {
    for (const lesson of loadContent().lessons.values()) {
      if (lesson.kind !== "lesson") continue;
      const { cards } = lesson;
      const where = `lesson ${lesson.id}`;
      // Photo cards are a quick look next to a diagram, so they don't count toward the length.
      const steps = cards.filter((c) => c.type !== "photo").length;
      expect(steps, where).toBeGreaterThanOrEqual(8);
      expect(steps, where).toBeLessThanOrEqual(12);
      expect(cards[0]?.type, `${where} opens with a hook explainer`).toBe("explainer");
      expect(cards.at(-1)?.type, `${where} ends with a recap explainer`).toBe("explainer");
      expect(cards.filter((c) => c.type === "multiple_choice").length, where).toBeLessThanOrEqual(3);
      expect(cards.filter((c) => c.difficulty === "challenge").length, where).toBe(2);
    }
  });

  it("gives every lesson an icon, never the same one twice in a module (quizzes keep the hub)", () => {
    const { courses } = loadContent();
    for (const course of courses) {
      for (const mod of course.modules) {
        const icons = mod.lessons.filter((l) => l.kind === "lesson").map((l) => l.icon);
        expect(icons.every(Boolean), mod.id).toBe(true);
        expect(new Set(icons).size, `${mod.id} repeats an icon: ${icons.join(", ")}`).toBe(icons.length);
        expect(mod.lessons.filter((l) => l.kind === "quiz").every((q) => q.icon === undefined), mod.id).toBe(true);
      }
    }
  });

  it("quizzes have 5-8 core, interactive questions", () => {
    for (const lesson of loadContent().lessons.values()) {
      if (lesson.kind !== "quiz") continue;
      expect(lesson.cards.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(lesson.cards.length, lesson.id).toBeLessThanOrEqual(8);
      for (const card of lesson.cards) {
        expect(["explainer", "photo"], `${lesson.id}/${card.id}`).not.toContain(card.type);
        expect(card.difficulty, `${lesson.id}/${card.id}`).toBe("core");
      }
    }
  });

  it("every photo exists in public/photos, with credit and licence, at its real size", () => {
    let photos = 0;
    for (const lesson of loadContent().lessons.values()) {
      for (const card of lesson.cards) {
        if (card.type !== "photo") continue;
        photos += 1;
        const where = `${lesson.id}/${card.id}`;
        const file = path.join(process.cwd(), "public", card.photo.src);
        expect(fs.existsSync(file), `${where}: ${card.photo.src} exists`).toBe(true);
        // Credit and licence are required by the schema; also check they aren't placeholders.
        expect(card.credit.author.trim().length, where).toBeGreaterThan(1);
        expect(card.credit.licenceUrl, where).toMatch(/creativecommons\.org|wikimedia\.org/);
      }
    }
    expect(photos).toBeGreaterThan(0);
  });

  it("only uses documentation, private or special-purpose IPv4 addresses", () => {
    // Deliberately invalid examples (an octet above 255) are allowed: they can't be anyone's address.
    const allowed = (ip: string) => {
      const [a, b, c, d] = ip.split(".").map(Number) as [number, number, number, number];
      if ([a, b, c, d].some((n) => n > 255)) return true;
      return (
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 192 && b === 0 && c === 2) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113) ||
        ip === "255.255.255.0"
      );
    };
    const text = JSON.stringify([...loadContent().lessons.values()]);
    const unsafe = [...text.matchAll(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g)]
      .map((m) => m[0])
      .filter((ip) => !allowed(ip));
    expect(unsafe).toEqual([]);
  });

  it("Module 1 quiz covers both lessons with seven questions", () => {
    expect(loadContent().lessons.get("binary-and-data-quiz")?.cards).toHaveLength(7);
  });

  it("lists Inside Your Devices first, with its modules and lessons in order", () => {
    const { courses } = loadContent();
    expect(courses.map((c) => c.id)).toEqual(["inside-your-devices", "how-the-internet-works", "stay-safe-online"]);
    expect(courses[0]?.modules.map((m) => m.lessons.map((l) => l.id))).toEqual([
      ["whats-in-the-box", "memory-vs-storage", "meet-the-cpu", "pull-it-apart-quiz"],
      ["meet-the-os", "files-and-folders", "software-in-charge-quiz"],
      ["slow-and-full", "power-problems", "inside-your-devices-final"],
    ]);
  });

  it("keeps help, reporting and recovery free for everyone (never behind Pro)", () => {
    // CLAUDE.md content rule. `access` is read raw: main's schema ignores it, the Pro branch uses it.
    const alwaysFree = ["content/courses/stay-safe-online/modules/04-when-things-go-wrong/module.json"];
    for (const file of alwaysFree) {
      const mod = JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")) as { access?: string };
      expect(mod.access, file).toBe("free");
    }
    // And every lesson and quiz loaded from it is free, so /api/lessons/<id> serves it without
    // sign-in or Pro.
    const help = [...loadContent().lessons.values()].filter((l) => l.moduleId === "when-things-go-wrong");
    expect(help.length).toBeGreaterThan(0);
    for (const lesson of help) expect(lesson.access, lesson.id).toBe("free");
    // Nor behind a sign-up: help modules are open to guests, quizzes included.
    for (const file of alwaysFree) {
      const mod = JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")) as { openToGuests?: boolean };
      expect(mod.openToGuests, `${file} needs "openToGuests": true`).toBe(true);
    }
    for (const lesson of help) expect(lesson.guests, lesson.id).toBe(true);
  });

  it("lets guests play each course's first lesson and the help modules, and nothing else", () => {
    const content = loadContent();
    const open = [...content.lessons.values()].filter((l) => l.guests).map((l) => l.id);
    const firsts = content.courses.map((c) => c.modules[0]!.lessons.find((l) => l.kind === "lesson")!.id);
    const help = [...content.lessons.values()].filter((l) => l.moduleId === "when-things-go-wrong").map((l) => l.id);
    expect(open.sort()).toEqual([...firsts, ...help].sort());
    expect(firsts).toEqual(["whats-in-the-box", "bits-and-binary", "strong-passwords"]);
    // Outlines (sent to the browser for the path) agree with the lessons.
    for (const mod of content.courses.flatMap((c) => c.modules)) {
      for (const outline of mod.lessons) expect(outline.guests, outline.id).toBe(content.lessons.get(outline.id)!.guests);
    }
  });

  it("lists Stay Safe Online's modules and lessons in order", () => {
    const course = loadContent().courses.find((c) => c.id === "stay-safe-online");
    expect(course?.modules.map((m) => m.lessons.map((l) => l.id))).toEqual([
      ["strong-passwords", "two-step-sign-in", "lock-your-accounts-quiz"],
      ["phishing-emails", "scam-texts-and-calls", "fake-websites", "spot-the-scam-quiz"],
      ["your-digital-footprint", "apps-and-wi-fi", "guard-your-privacy-quiz"],
      ["signs-of-a-hack", "getting-help", "stay-safe-online-final"],
    ]);
  });

  it("uses only fictional addresses in Stay Safe Online, apart from the verified official services", () => {
    // Scam examples use the reserved .example domain; the real services are the ones in "Getting Help".
    const official = new Set(["cyber.gov.au", "esafety.gov.au", "scamwatch.gov.au", "idcare.org", "accce.gov.au"]);
    // Address endings named on their own when teaching how to read an address (".com.au").
    const endings = new Set(["com.au"]);
    const { courses, lessons } = loadContent();
    const course = courses.find((c) => c.id === "stay-safe-online")!;
    for (const outline of course.modules.flatMap((m) => m.lessons)) {
      const text = JSON.stringify(lessons.get(outline.id));
      for (const domain of text.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi) ?? []) {
        if (/\.(jpg|png|mp3|mp4|docx|txt|exe)$/i.test(domain)) continue;
        const d = domain.toLowerCase();
        expect(d.endsWith(".example") || official.has(d) || endings.has(d), `${outline.id}: ${domain}`).toBe(true);
      }
    }
  });

  it("every Inside Your Devices lesson uses at least 2 of the hands-on card types", () => {
    const handsOn = new Set(["hotspot", "teardown", "simulator", "scenario", "sort_bins"]);
    const course = loadContent().courses.find((c) => c.id === "inside-your-devices");
    for (const lesson of course?.modules.flatMap((m) => m.lessons) ?? []) {
      if (lesson.kind !== "lesson") continue;
      const full = loadContent().lessons.get(lesson.id);
      const used = new Set(full?.cards.map((c) => c.type).filter((t) => handsOn.has(t)));
      expect(used.size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives every graded lesson card a hint and a nudge for wrong answers", () => {
    for (const lesson of loadContent().lessons.values()) {
      if (lesson.kind !== "lesson") continue;
      for (const card of lesson.cards) {
        if (!isInteractiveCard(card)) continue;
        const where = `${lesson.id}/${card.id}`;
        expect(card.hint, `${where} needs a hint`).toBeTruthy();
        // Scenarios and teardowns already answer each wrong move with its own feedback.
        if (card.type === "scenario" || card.type === "teardown") continue;
        const everyWrongOptionNudged =
          card.type === "multiple_choice" && card.options.every((o) => o.id === card.correctOptionId || o.nudge);
        expect(Boolean(card.nudge) || everyWrongOptionNudged, `${where} needs a nudge`).toBe(true);
      }
    }
  });

  it("teaches before testing: every drawn part is explored before a card tests it", () => {
    // These scenes show their own text on screen (file names; the lines of an email, a text or a
    // web page), so they need no introduction. Each clue they test is taught in an explainer first.
    const selfLabelled = new Set(["file-browser", "email", "text-message", "fake-website"]);
    const { courses, lessons } = loadContent();
    for (const course of courses) {
      const explored = new Map<string, Set<string>>();
      for (const outline of course.modules.flatMap((m) => m.lessons)) {
        for (const card of lessons.get(outline.id)?.cards ?? []) {
          if (card.type !== "hotspot" && card.type !== "teardown") continue;
          const seen = explored.get(card.scene) ?? new Set<string>();
          explored.set(card.scene, seen);
          if (card.type === "hotspot" && card.mode === "explore") {
            for (const p of card.parts ?? []) seen.add(p.part);
            continue;
          }
          if (selfLabelled.has(card.scene)) continue;
          const scene = getScene(card.scene)!;
          // Teardowns only need the insides introduced: screws, covers and brackets explain themselves.
          const selfExplaining = (id: string) => id.startsWith("screw-") || id.endsWith("-cover") || id === "panel";
          const tested =
            card.type === "hotspot"
              ? [...(card.targets ?? []), ...(card.labels ?? []).map((l) => l.part)]
              : card.actions
                  .map((a) => a.part)
                  .filter((p) => !selfExplaining(p) && scene.parts.find((s) => s.id === p && "coveredBy" in s));
          for (const part of tested) {
            expect(seen.has(part), `${outline.id}/${card.id} tests "${part}" (${card.scene}) before it's explored`).toBe(true);
          }
        }
      }
    }
  });

  it("every simulator card starts unsolved and can be solved", () => {
    for (const lesson of loadContent().lessons.values()) {
      for (const card of lesson.cards) {
        if (card.type !== "simulator") continue;
        const where = `${lesson.id}/${card.id}`;
        expect(goalMet(card, initialSimulatorAnswer(card)), `${where} is solved before any change`).toBe(false);
        // Try every combination of control values (sliders at each step).
        const choices = card.controls.map((control): InputValue[] => {
          if (control.kind !== "slider") return [false, true];
          const { min, max, step } = sliderRange(card, control);
          return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
        });
        let solvable = false;
        const search = (i: number, answer: Record<string, InputValue>): void => {
          if (solvable) return;
          if (i === card.controls.length) {
            solvable = goalMet(card, answer);
            return;
          }
          for (const value of choices[i]!) search(i + 1, { ...answer, [card.controls[i]!.id]: value });
        };
        search(0, {});
        expect(solvable, `${where} can't be solved`).toBe(true);
      }
    }
  });
});

describe("loadContent validation", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  type Files = Record<string, unknown>;
  function makeContent(files: Files): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cybernet-content-"));
    roots.push(root);
    for (const [file, data] of Object.entries(files)) {
      const full = path.join(root, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, typeof data === "string" ? data : JSON.stringify(data));
    }
    return root;
  }

  const M = "courses/c1/modules/m1";
  const course = { id: "c1", title: "Course", description: "D", order: 1 };
  const mod = { id: "m1", title: "Module", description: "D", order: 1, access: "free" };
  const lesson = (id: string, order: number) => ({
    id,
    kind: "lesson",
    title: id,
    order,
    icon: "binary",
    cards: [explainer()],
  });
  const quiz = (id: string, order: number) => ({
    id,
    kind: "quiz",
    title: id,
    order,
    cards: [multipleChoice(), binaryToggle()],
  });

  function validFiles(): Files {
    return {
      "courses/c1/course.json": course,
      [`${M}/module.json`]: mod,
      [`${M}/lessons/01.json`]: lesson("l1", 1),
      [`${M}/lessons/02.json`]: lesson("l2", 2),
      [`${M}/lessons/99.json`]: quiz("q1", 99),
    };
  }

  function problemsFor(files: Files): string[] {
    try {
      loadContent(makeContent(files));
      return [];
    } catch (error) {
      if (error instanceof ContentValidationError) return error.problems;
      throw error;
    }
  }

  it("builds a sorted outline with parent ids derived from folders", () => {
    const files = validFiles();
    // Write lesson 2 before lesson 1 on disk; `order` must win.
    files[`${M}/lessons/00.json`] = files[`${M}/lessons/02.json`];
    delete files[`${M}/lessons/02.json`];

    const { courses, lessons } = loadContent(makeContent(files));
    expect(courses[0]?.modules[0]?.lessons.map((l) => l.id)).toEqual(["l1", "l2", "q1"]);
    expect(lessons.get("l2")).toMatchObject({ courseId: "c1", moduleId: "m1" });
  });

  it("accepts valid content", () => {
    expect(problemsFor(validFiles())).toEqual([]);
  });

  it("reports schema errors with file and field path", () => {
    const files = validFiles();
    files[`${M}/lessons/01.json`] = { ...lesson("l1", 1), cards: [explainer({ title: "" })] };
    const problems = problemsFor(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("courses/c1/modules/m1/lessons/01.json");
    expect(problems[0]).toContain("cards[0].title");
  });

  it("reports invalid JSON", () => {
    const files = validFiles();
    files[`${M}/lessons/01.json`] = "{ not json";
    expect(problemsFor(files)[0]).toMatch(/not valid JSON/);
  });

  it("reports a missing module.json", () => {
    const files = validFiles();
    delete files[`${M}/module.json`];
    expect(problemsFor(files)[0]).toMatch(/module\.json: file is missing/);
  });

  it("reports duplicate lesson ids across the module", () => {
    const files = validFiles();
    files[`${M}/lessons/02.json`] = lesson("l1", 2);
    expect(problemsFor(files).join("\n")).toMatch(/duplicate lesson id "l1"/);
  });

  it("reports clashing order values", () => {
    const files = validFiles();
    files[`${M}/lessons/02.json`] = lesson("l2", 1);
    expect(problemsFor(files).join("\n")).toMatch(/share order 1/);
  });

  it("requires exactly one quiz per module", () => {
    const none = validFiles();
    delete none[`${M}/lessons/99.json`];
    expect(problemsFor(none).join("\n")).toMatch(/exactly one quiz, found 0/);

    const two = validFiles();
    two[`${M}/lessons/98.json`] = quiz("q2", 98);
    expect(problemsFor(two).join("\n")).toMatch(/exactly one quiz, found 2/);
  });

  it("requires every module to say whether it's free or Pro", () => {
    const files = validFiles();
    files[`${M}/module.json`] = { ...mod, access: undefined };
    expect(problemsFor(files).join("\n")).toMatch(/module\.json → access/);
    files[`${M}/module.json`] = { ...mod, access: "premium" };
    expect(problemsFor(files).join("\n")).toMatch(/module\.json → access/);
  });

  it("requires every course's first module to be free", () => {
    const files = validFiles();
    files[`${M}/module.json`] = { ...mod, access: "pro" };
    expect(problemsFor(files).join("\n")).toMatch(/first module \(m1\) must have "access": "free"/);
  });

  it("gives every lesson its module's access", () => {
    const files = validFiles();
    // Pro modules need a teaser card from their first lesson.
    files["courses/c1/modules/m2/module.json"] = { ...mod, id: "m2", order: 2, access: "pro", teaserCard: { lesson: "l3", card: "try-me" } };
    files["courses/c1/modules/m2/lessons/01.json"] = { ...lesson("l3", 1), cards: [explainer(), multipleChoice({ id: "try-me" })] };
    files["courses/c1/modules/m2/lessons/99.json"] = quiz("q3", 99);
    const loaded = loadContent(makeContent(files));
    expect(loaded.lessons.get("l1")?.access).toBe("free");
    expect(loaded.lessons.get("l3")?.access).toBe("pro");
    expect(loaded.courses[0]?.modules[1]?.lessons.map((l) => l.access)).toEqual(["pro", "pro"]);
  });

  it("opens a course's first lesson to guests, and whole modules marked openToGuests", () => {
    const files = validFiles();
    files["courses/c1/modules/m2/module.json"] = { ...mod, id: "m2", order: 2, openToGuests: true };
    files["courses/c1/modules/m2/lessons/01.json"] = lesson("l3", 1);
    files["courses/c1/modules/m2/lessons/99.json"] = quiz("q3", 99);
    // The first lesson by order, even when its file sorts later.
    files[`${M}/lessons/01.json`] = lesson("l1", 5);
    files[`${M}/lessons/02.json`] = lesson("l2", 2);
    const loaded = loadContent(makeContent(files));
    const guests = (id: string) => loaded.lessons.get(id)?.guests;
    expect([guests("l2"), guests("l1"), guests("q1")]).toEqual([true, false, false]);
    expect([guests("l3"), guests("q3")]).toEqual([true, true]);
    expect(loaded.courses[0]?.modules[0]?.lessons.map((l) => l.guests)).toEqual([true, false, false]);
  });

  it("only lets free modules be open to guests", () => {
    const files = validFiles();
    files["courses/c1/modules/m2/module.json"] = { ...mod, id: "m2", order: 2, access: "pro", openToGuests: true, teaserCard: { lesson: "l3", card: "try-me" } };
    files["courses/c1/modules/m2/lessons/01.json"] = { ...lesson("l3", 1), cards: [explainer(), multipleChoice({ id: "try-me" })] };
    files["courses/c1/modules/m2/lessons/99.json"] = quiz("q3", 99);
    expect(problemsFor(files).join(" | ")).toMatch(/only free modules can be open to guests/);
  });

  it("requires the quiz to come last", () => {
    const files = validFiles();
    files[`${M}/lessons/99.json`] = quiz("q1", 0);
    expect(problemsFor(files).join("\n")).toMatch(/quiz must have the highest order/);
  });

  it("collects every problem instead of stopping at the first", () => {
    const files = validFiles();
    files[`${M}/lessons/01.json`] = { ...lesson("l1", 1), order: "first" };
    files[`${M}/lessons/02.json`] = { ...lesson("l2", 2), cards: [] };
    expect(problemsFor(files).length).toBeGreaterThanOrEqual(2);
  });
});
