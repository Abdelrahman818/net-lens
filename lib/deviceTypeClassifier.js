const DEVICE_TYPES = [
  "switch",
  "router",
  "firewall",
  "access_point",
  "camera",
  "access_control",
  "ip_phone",
  "printer",
  "pc",
  "server",
  "unknown",
];

const VENDOR_OUIS = {
  "00000c": "Cisco",
  "000c42": "MikroTik",
  "002722": "Ubiquiti",
  "c056e3": "Hikvision",
  "3cecef": "Dahua",
  "3cd92b": "Hewlett Packard Enterprise",
  "001c23": "Dell",
  "001e10": "Huawei",
  "50c7bf": "TP-Link",
  "001e73": "ZTE",
  "001195": "D-Link",
  "001c7f": "Fortinet",
  "001321": "Juniper",
  "00408c": "Axis",
  "001565": "Yealink",
  "000b82": "Grandstream",
};

const DEVICE_FINGERPRINTS = [
  { type: "switch", vendor: "Cisco", field: "sysDescr", pattern: /\b(catalyst|nexus|ios[- ]?xe|switch)\b/i, weight: 0.4, label: "Cisco switch fingerprint" },
  { type: "router", vendor: "MikroTik", field: "sysDescr", pattern: /\b(routeros|routerboard|mikrotik)\b/i, weight: 0.4, label: "MikroTik router fingerprint" },
  { type: "router", vendor: "Cisco", field: "sysDescr", pattern: /\b(ios|router)\b/i, weight: 0.4, label: "Cisco router fingerprint" },
  { type: "camera", vendor: "Hikvision", field: "all", pattern: /\b(hikvision|ds[- ]?2|ipc|camera)\b/i, weight: 0.4, label: "Hikvision camera fingerprint" },
  { type: "camera", vendor: "Dahua", field: "all", pattern: /\b(dahua|ipc|nvr|camera)\b/i, weight: 0.4, label: "Dahua camera fingerprint" },
  { type: "firewall", vendor: "Fortinet", field: "all", pattern: /\b(fortigate|fortios)\b/i, weight: 0.4, label: "Fortinet firewall fingerprint" },
  { type: "switch", vendor: "Juniper", field: "all", pattern: /\b(juniper|junos|ex[- ]?\d+)\b/i, weight: 0.4, label: "Juniper switch fingerprint" },
  { type: "router", vendor: "Juniper", field: "all", pattern: /\b(srx|junos)\b/i, weight: 0.4, label: "Juniper router fingerprint" },
  { type: "ip_phone", vendor: "Yealink", field: "all", pattern: /\b(yealink|sip|voip|phone)\b/i, weight: 0.4, label: "IP phone fingerprint" },
  { type: "ip_phone", vendor: "Grandstream", field: "all", pattern: /\b(grandstream|sip|voip|phone)\b/i, weight: 0.4, label: "IP phone fingerprint" },
  { type: "access_point", vendor: "Ubiquiti", field: "all", pattern: /\b(unifi|ubiquiti|access[ -]?point|ap)\b/i, weight: 0.4, label: "Access point fingerprint" },
  { type: "printer", field: "all", pattern: /\b(printer|laserjet|deskjet|officejet)\b/i, weight: 0.4, label: "Printer fingerprint" },
  { type: "access_control", field: "all", pattern: /\b(access[ -]?control|door|badge|entry)\b/i, weight: 0.4, label: "Access control fingerprint" },
  { type: "server", field: "all", pattern: /\b(server|windows server|linux server|ubuntu server)\b/i, weight: 0.4, label: "Server fingerprint" },
  { type: "pc", field: "all", pattern: /\b(desktop|laptop|workstation|pc)\b/i, weight: 0.4, label: "PC fingerprint" },
];

const normalizeMac = (value) => {
  const hex = String(value || "").replace(/[^a-f\d]/gi, "").toLowerCase();
  return hex.length === 12 ? hex : null;
};

function valuesFor(device) {
  const source = device && typeof device === "object" ? device : {};
  const fields = {
    hostname: source.hostname,
    name: source.name,
    sysName: source.sysName,
    sysDescr: source.sysDescr,
    description: source.description,
    model: source.model,
    vendor: source.vendor,
  };
  const nested = [source.snmp, source.info, source.system].filter(Boolean);
  nested.forEach((item) => {
    Object.keys(fields).forEach((key) => {
      if (!fields[key] && item[key]) fields[key] = item[key];
    });
  });
  const all = Object.values(fields).filter(Boolean).join(" ");
  const neighborText = Array.isArray(source.neighbors)
    ? source.neighbors.map((neighbor) => Object.values(neighbor || {}).join(" ")).join(" ")
    : "";
  return { fields, all: `${all} ${neighborText}` };
}

class DeviceTypeClassifier {
  static normalizeMac(value) {
    return normalizeMac(value);
  }

  static classify(device = {}) {
    const mac = normalizeMac(device.mac);
    const oui = mac?.slice(0, 6);
    const ouiVendor = oui ? VENDOR_OUIS[oui] || null : null;
    const { fields, all } = valuesFor(device);
    const vendor = device.vendor || ouiVendor || null;
    const scores = new Map();
    const evidence = [];
    const add = (type, score, label) => {
      if (!scores.has(type)) scores.set(type, 0);
      scores.set(type, Math.min(1, scores.get(type) + score));
      if (label && !evidence.includes(label)) evidence.push(label);
    };

    if (ouiVendor) evidence.push(`${ouiVendor} OUI`);

    DEVICE_FINGERPRINTS.forEach((rule) => {
      const text = rule.field === "all" ? all : String(fields[rule.field] || "");
      const vendorMatches = !rule.vendor || new RegExp(rule.vendor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(`${vendor} ${all}`);
      if (vendorMatches && rule.pattern.test(text)) add(rule.type, rule.weight, rule.label);
    });

    const hostnameRules = [
      ["router", /\b(router|gateway|gw)\b/i, "hostname suggests router"],
      ["switch", /\b(switch|sw)\b/i, "hostname suggests switch"],
      ["access_point", /\b(ap|access[ -]?point|wifi)\b/i, "hostname suggests access point"],
      ["camera", /\b(camera|cam|ipc|nvr)\b/i, "hostname suggests camera"],
      ["ip_phone", /\b(phone|voip|sip)\b/i, "hostname suggests IP phone"],
      ["printer", /\b(printer|laserjet|deskjet)\b/i, "hostname suggests printer"],
      ["server", /\b(server|srv)\b/i, "hostname suggests server"],
      ["pc", /\b(pc|desktop|laptop|workstation)\b/i, "hostname suggests PC"],
    ];
    const hostText = [fields.hostname, fields.name, fields.sysName].filter(Boolean).join(" ");
    hostnameRules.forEach(([type, pattern, label]) => {
      if (pattern.test(hostText)) add(type, 0.2, label);
    });

    const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] < 0.2) {
      return { type: "unknown", confidence: 0, vendor, evidence };
    }

    return {
      type: DEVICE_TYPES.includes(best[0]) ? best[0] : "unknown",
      confidence: Number(best[1].toFixed(2)),
      vendor,
      evidence,
    };
  }
}

function classifyDevice(device) {
  const classification = DeviceTypeClassifier.classify(device);
  return {
    ...device,
    type: classification.type,
    vendor: device.vendor || classification.vendor,
    classification,
  };
}

export { DEVICE_FINGERPRINTS, DEVICE_TYPES, VENDOR_OUIS, classifyDevice, normalizeMac };
export default DeviceTypeClassifier;
