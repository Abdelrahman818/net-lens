import assert from "node:assert/strict";
import test from "node:test";
import DeviceTypeClassifier, { normalizeMac } from "./deviceTypeClassifier.js";

test("normalizes common MAC formats", () => {
  const formats = ["00:0c:42:8a:37:b8", "00-0C-42-8A-37-B8", "000c.428a.37b8", "000C428A37B8"];
  formats.forEach((mac) => assert.equal(normalizeMac(mac), "000c428a37b8"));
});

test("classifies representative device fingerprints", () => {
  assert.equal(DeviceTypeClassifier.classify({ mac: "00:0c:42:8a:37:b8", sysDescr: "MikroTik RouterOS" }).type, "router");
  assert.equal(DeviceTypeClassifier.classify({ mac: "00:1b:17:8a:37:b8", sysDescr: "Hikvision DS-2 camera" }).type, "camera");
  assert.equal(DeviceTypeClassifier.classify({ mac: "3c:ec:ef:8a:37:b8", sysDescr: "Dahua NVR IPC" }).type, "camera");
  assert.equal(DeviceTypeClassifier.classify({ mac: "00:1c:7f:8a:37:b8", sysDescr: "FortiGate FortiOS" }).type, "firewall");
  assert.equal(DeviceTypeClassifier.classify({ mac: "00:13:21:8a:37:b8", sysDescr: "Juniper EX3400" }).type, "switch");
  assert.equal(DeviceTypeClassifier.classify({ mac: "00:15:65:8a:37:b8", hostname: "phone-01", sysDescr: "Yealink SIP" }).type, "ip_phone");
});

test("handles sparse and conflicting evidence deterministically", () => {
  assert.equal(DeviceTypeClassifier.classify({ mac: "aa:bb:cc:dd:ee:ff" }).type, "unknown");
  assert.equal(DeviceTypeClassifier.classify({ mac: "00:0c:42:8a:37:b8" }).vendor, "MikroTik");
  const result = DeviceTypeClassifier.classify({ vendor: "Cisco", hostname: "ap-01", sysDescr: "Cisco Catalyst switch" });
  assert.equal(result.type, "switch");
  assert.ok(result.evidence.some((item) => item.includes("switch")));
  assert.ok(result.confidence > 0);
});
