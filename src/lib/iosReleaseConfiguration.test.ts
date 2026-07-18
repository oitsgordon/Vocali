import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("iOS release configuration", () => {
  it("targets iPhone in portrait orientation only", () => {
    const project = readRepositoryFile(
      "ios/App/App.xcodeproj/project.pbxproj",
    );
    const infoPlist = readRepositoryFile("ios/App/App/Info.plist");

    expect(project).not.toContain('TARGETED_DEVICE_FAMILY = "1,2"');
    expect(project.match(/TARGETED_DEVICE_FAMILY = 1;/g)).toHaveLength(2);
    expect(infoPlist).toContain("UIInterfaceOrientationPortrait");
    expect(infoPlist).not.toContain("UIInterfaceOrientationLandscape");
    expect(infoPlist).not.toContain("UISupportedInterfaceOrientations~ipad");
  });

  it("includes the app privacy manifest in Xcode resources", () => {
    const project = readRepositoryFile(
      "ios/App/App.xcodeproj/project.pbxproj",
    );
    const manifest = readRepositoryFile("ios/App/App/PrivacyInfo.xcprivacy");

    expect(project).toContain("PrivacyInfo.xcprivacy in Resources");
    expect(manifest).toContain("NSPrivacyCollectedDataTypeEmailAddress");
    expect(manifest).toContain("NSPrivacyCollectedDataTypeOtherUserContent");
    expect(manifest).toContain("<key>NSPrivacyTracking</key>");
    expect(manifest).toContain("<false/>");
  });

  it("keeps TestFlight upload eligible for App Store submission", () => {
    const codemagic = readRepositoryFile("codemagic.yaml");

    expect(codemagic).not.toContain("testFlightInternalTestingOnly");
    expect(codemagic).toContain("submit_to_testflight: true");
    expect(codemagic).toContain("submit_to_app_store: false");
    expect(codemagic).toContain("Verify hosted release pages");
  });
});
