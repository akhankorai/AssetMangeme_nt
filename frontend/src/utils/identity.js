export function normalizeIdentityValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function canonicalIdentityValue(value) {
  return normalizeIdentityValue(value).replace(/[^a-z0-9]/g, "");
}

export function isTaskAssignedToCurrentUser(taskAssignee, identityKeys) {
  const assignee = normalizeIdentityValue(taskAssignee);
  const assigneeCanonical = canonicalIdentityValue(taskAssignee);
  if (!assignee) {
    return false;
  }
  for (const key of identityKeys) {
    const normalizedKey = normalizeIdentityValue(key);
    const canonicalKey = canonicalIdentityValue(key);
    if (!normalizedKey) {
      continue;
    }
    if (
      assignee === normalizedKey ||
      assignee.includes(normalizedKey) ||
      normalizedKey.includes(assignee) ||
      (assigneeCanonical && canonicalKey && assigneeCanonical === canonicalKey)
    ) {
      return true;
    }
  }
  return false;
}
