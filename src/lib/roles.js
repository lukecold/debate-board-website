// Role helpers for the UserRole enum: owner, admin, org_admin, user

export function isAdminRole(role) {
  return role === 'owner' || role === 'admin' || role === 'org_admin';
}

export function isOwnerRole(role) {
  return role === 'owner';
}

export function roleBadgeLabel(role) {
  switch (role) {
    case 'owner': return 'Owner';
    case 'admin': return 'Admin';
    case 'org_admin': return 'Org Admin';
    default: return null;
  }
}

export function roleBadgeClass(role) {
  switch (role) {
    case 'owner': return 'role-badge role-owner';
    case 'admin': return 'role-badge role-admin';
    case 'org_admin': return 'role-badge role-org-admin';
    default: return '';
  }
}
