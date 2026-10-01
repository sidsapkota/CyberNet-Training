import { describe, expect, it } from "vitest";
import { inAppBrowser } from "./inApp";

// Real-world shaped user agents (trimmed).
const UA = {
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.25.80 (iPhone15,3; iOS 18_5; en_AU)",
  instagramAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.0.0 Mobile Safari/537.36 Instagram 345.0.0.42.93 Android (34/14; 420dpi)",
  tiktok: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_34.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/AU",
  tiktokAndroid: "Mozilla/5.0 (Linux; Android 13; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 trill_330003 BytedanceWebview/d8a21c6",
  facebook: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.103;FBBV/612345;FBDV/iPhone15,2]",
  messenger: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerLiteForiOS;FBAV/470.0]",
  messengerAndroid: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/127.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/470.0.0.0;]",
  snapchat: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.0.0.40 (like Safari/8618.2.12.10.8)",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  chrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
};

describe("in-app browser detection", () => {
  it("spots Instagram, TikTok, Facebook, Messenger and Snapchat", () => {
    expect(inAppBrowser(UA.instagramIos)).toBe("Instagram");
    expect(inAppBrowser(UA.instagramAndroid)).toBe("Instagram");
    expect(inAppBrowser(UA.tiktok)).toBe("TikTok");
    expect(inAppBrowser(UA.tiktokAndroid)).toBe("TikTok");
    expect(inAppBrowser(UA.facebook)).toBe("Facebook");
    expect(inAppBrowser(UA.messenger)).toBe("Messenger");
    expect(inAppBrowser(UA.messengerAndroid)).toBe("Messenger");
    expect(inAppBrowser(UA.snapchat)).toBe("Snapchat");
  });

  it("leaves normal browsers alone (Google sign-in works there)", () => {
    for (const ua of [UA.safari, UA.chrome, UA.edge, "", null, undefined]) expect(inAppBrowser(ua)).toBeNull();
  });
});
