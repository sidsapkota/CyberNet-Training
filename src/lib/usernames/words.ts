/**
 * Word lists for username safety. Learners can be 13, so a username must never be rude, hateful,
 * sexual, about drugs or violence, pretend to be staff, or carry contact details. These lists are
 * only ever used to *reject* a name: they're never shown to learners or written to logs.
 *
 * - `ANYWHERE` words are distinctive enough to block wherever they appear, even hidden inside a
 *   longer name ("CoolXxxMan").
 * - `WHOLE` words are short or common inside innocent words ("ass" in "class"), so they only count
 *   as a whole part of the name: the whole name, or a part split by underscores, capitals or digits.
 * - `ALLOWED` words contain a blocked word by accident (the Scunthorpe problem). They're removed
 *   before searching, so "Therapist" and "Assassin" are fine.
 */

export const ANYWHERE: readonly string[] = [
  // swears and insults
  "fuck", "fuk", "fck", "shit", "bitch", "cunt", "bastard", "wank", "twat", "bollock", "asshole",
  "arsehole", "asshat", "asswipe", "dumbass", "jackass", "dickhead", "motherf", "bullshit", "piss",
  "slut", "whore", "skank", "douche",
  // slurs and hate terms
  "nigger", "nigga", "faggot", "retard", "spastic", "tranny", "wetback", "raghead", "towelhead",
  "chink", "kike", "beaner", "gook", "nazi", "hitler", "heil", "kkk", "whitepower", "whitepride",
  "siegheil", "genocide", "jihad",
  // sexual terms
  "porn", "penis", "vagina", "dildo", "horny", "sexy", "boob", "titty", "titties", "nude", "naked",
  "orgasm", "blowjob", "handjob", "milf", "hentai", "fetish", "erotic", "nsfw", "onlyfans", "sex",
  "pussy", "cock", "rape", "rapist", "pedo", "paedo",
  // drugs
  "cocaine", "heroin", "weed", "stoner", "drug", "ecstasy", "ketamine", "fentanyl", "meth",
  // violence and self-harm
  "kill", "murder", "suicide", "selfharm", "terrorist", "massacre", "shooting", "behead",
  // impersonating the app or staff
  "admin", "moderator", "cybernet", "official", "support", "helpdesk", "verified", "staff",
  "teacher",
  // contact details and social apps
  "gmail", "hotmail", "outlook", "yahoo", "icloud", "email", "phone", "mobile", "whatsapp",
  "snapchat", "instagram", "insta", "tiktok", "discord", "telegram", "youtube", "twitch",
  "facebook", "http", "www", "dotcom", "dmme", "textme", "callme", "addme", "myname", "realname",
  "imreal", "iamreal",
];

export const WHOLE: readonly string[] = [
  "ass", "arse", "dick", "fag", "dyke", "coon", "spic", "paki", "cum", "tit", "tits", "hoe", "hoes",
  "kys", "isis", "crack", "coke", "lsd", "vape", "mod", "mods", "team", "root", "owner", "system",
  "security", "irl", "kik", "snap", "com", "dm", "address", "street",
];

/** Digit groups that are rude or hateful codes. */
export const BLOCKED_NUMBERS: readonly string[] = ["69", "88", "420", "1488", "666"];

export const ALLOWED: readonly string[] = [
  "assassin", "assist", "assemble", "classic", "class", "glass", "grass", "brass", "bass", "mass",
  "pass", "compass", "embassy", "scunthorpe", "therapist", "grape", "drape", "cocktail", "peacock",
  "hancock", "shuttlecock", "sussex", "essex", "middlesex", "shitake", "shiitake", "skill",
  "skilled", "skillful", "killarney", "heroine", "method", "methane", "something", "tweed",
  "document", "cucumber", "circumstance", "scrape",
  "cockatoo", "cockpit", "cockroach", "stafford", "xylophone", "saxophone", "headphone",
  "headphones", "microphone", "megaphone", "automobile", "instant", "install", "instance",
  "pedometer", "torpedo", "thorny", "shootingstar", "troubleshooting", "swank", "badminton",
];
