import { describe, expect, it } from "vitest";
import { checkUsername, USERNAME_MESSAGES, usernameKey } from "./check";
import { generateUsername } from "./generate";
import { canChangeUsername, isUsernameChange, nextUsernameChange } from "./rules";

const blocked = (name: string) => {
  const result = checkUsername(name);
  return !result.ok && result.problem === "blocked";
};

describe("username shape", () => {
  it("allows 3 to 20 letters, numbers and underscores, with at most 3 digits", () => {
    expect(checkUsername("PacketPilot482")).toEqual({ ok: true, username: "PacketPilot482" });
    expect(checkUsername("  sam_codes  ")).toEqual({ ok: true, username: "sam_codes" });
    expect(checkUsername("ab")).toMatchObject({ ok: false, problem: "length" });
    expect(checkUsername("a".repeat(21))).toMatchObject({ ok: false, problem: "length" });
    expect(checkUsername("sam.codes")).toMatchObject({ ok: false, problem: "characters" });
    expect(checkUsername("sam codes")).toMatchObject({ ok: false, problem: "characters" });
    expect(checkUsername("f.u.c.k")).toMatchObject({ ok: false, problem: "characters" });
    expect(checkUsername("123_456")).toMatchObject({ ok: false, problem: "letters" });
    expect(checkUsername("jo0412345")).toMatchObject({ ok: false, problem: "digits" });
  });

  it("never says which word was caught", () => {
    const result = checkUsername("sh1tlord");
    expect(result).toEqual({ ok: false, problem: "blocked", message: "Try a different username." });
    expect(USERNAME_MESSAGES.blocked).not.toMatch(/sh|word|rude/i);
  });

  it("is unique ignoring case", () => {
    expect(usernameKey("PacketPilot")).toBe(usernameKey("packetpilot"));
  });
});

describe("disguised and hidden words are caught", () => {
  it.each([
    // leetspeak and symbols
    "sh1t", "a55hat", "fuk_u", "b1tch3s", "n00b_k1ller", "5exyb0y", "p0rn", "h0rny_gamer",
    // separators (underscores are the only separator the shape allows)
    "f_u_c_k", "s_h_i_t_head", "b_i_t_c_h",
    // repeated letters
    "fuuuuck", "shiiiit", "asssss",
    // hidden inside a longer name
    "CoolPenisMan", "xXweedXx", "HitlerFan", "BigDrugDealer", "KillYourself7", "sexyboy",
    "LilCokeHead", "the_ass_man", "DickRider",
    // hate terms and codes
    "nazi_gamer", "WhitePower", "Gamer88", "Code_420", "kkk_member",
    // impersonation
    "admin", "Adm1n_Team", "CyberNetSupport", "0fficial", "mod_sam", "ModSam", "staff",
    "cybernet_training", "Teacher_Jo", "Verified_Pro", "TeamLead", "root",
    // contact details and social apps
    "sam_gmail", "GmailBoy", "callme_now", "TextMe99", "MyNameIsSam", "SnapMeBro", "AdminBob", "Mod", "FuckRouter", "PenIsland", "wwwsite", "snap_ella", "realname_jo", "InstaJo", "add_me_dm",
  ])("rejects %s", (name) => {
    expect(blocked(name)).toBe(true);
  });
});

describe("innocent names aren't caught (the Scunthorpe problem)", () => {
  it.each([
    "Assassin_99", "ClassicGamer", "GrapeJuice", "Scunthorpe", "Therapist", "Cocktail",
    "Sussex_Fan", "Shitake", "Hello_World", "PacketPilot482", "SkillfulCoder", "Peacock7",
    "Badminton_Ace", "InstantNoodle", "Saxophone", "MethodMan", "Cucumber", "GlassHouse",
    "Titan_Up", "Dickens_Fan", "Comet_Rider", "Hancock", "Torpedo", "ThornyRose", "BassDrop",
  ])("allows %s", (name) => {
    expect(checkUsername(name).ok).toBe(true);
  });
});

describe("suggested usernames", () => {
  it("are always valid, up to 20 characters, with at most 3 digits", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 500; i++) {
      const name = generateUsername(random);
      expect(checkUsername(name).ok, name).toBe(true);
      expect(name.length).toBeLessThanOrEqual(20);
    }
  });
});

describe("changing a username", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  it("is free the first time, then once every 30 days", () => {
    expect(canChangeUsername(null, now)).toBe(true);
    expect(canChangeUsername("2026-09-20T00:00:00Z", now)).toBe(false);
    expect(nextUsernameChange("2026-09-20T00:00:00Z", now)?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(canChangeUsername("2026-09-01T00:00:00Z", now)).toBe(true);
  });
});

describe("isUsernameChange: a generated name is not picked yet", () => {
  it("picking the first name isn't a change", () => {
    expect(isUsernameChange(null, false)).toBe(false);
  });
  it("replacing a generated name isn't a change (the first real pick stays free)", () => {
    expect(isUsernameChange("PacketPilot482", true)).toBe(false);
  });
  it("replacing a picked name is a change", () => {
    expect(isUsernameChange("MyOwnName", false)).toBe(true);
  });
});
