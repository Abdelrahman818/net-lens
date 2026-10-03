function identityFor(device) {
  const mac = String(device?.mac || "").trim().toLowerCase();
  if (mac) return `mac:${mac.replace(/[-.]/g, ":")}`;
  const id = device?.id || device?._id;
  if (id) return `id:${id}`;
  return `ip:${device?.ip || ""}`;
}

export function combineDeviceInventory(devices = [], endpoints = []) {
  const unique = new Map();
  const seenIds = new Set();
  const seenMacs = new Set();

  [...devices, ...endpoints].forEach((device) => {
    const id = device?.id || device?._id;
    const normalizedId = id ? String(id) : null;
    const mac = device?.mac ? `mac:${device.mac.replace(/[-.:]/g, "").toLowerCase()}` : null;
    const key = identityFor(device);

    if (
      (normalizedId && seenIds.has(normalizedId))
      || (mac && seenMacs.has(mac))
    ) {
      return;
    }

    unique.set(key, device);
    if (normalizedId) seenIds.add(normalizedId);
    if (mac) seenMacs.add(mac);
  });

  return [...unique.values()];
}
