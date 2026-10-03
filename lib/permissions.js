export const ROLE_PERMISSIONS = {
  admin: ["network:view", "discovery:run", "devices:manage", "devices:rename", "groups:manage", "health:view", "users:manage", "settings:manage", "terminal:use"],
  operator: ["network:view", "discovery:run", "devices:manage", "groups:manage", "health:view", "terminal:use"],
  viewer: ["network:view", "discovery:run", "health:view"],
};

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function can(user, permission) {
  return Boolean(user && permissionsForRole(user.role).includes(permission));
}

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}
