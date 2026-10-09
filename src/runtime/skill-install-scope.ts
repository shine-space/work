type SkillTargetScope = {
  teamId: string | null;
  employeeIds: string[];
  projectIds: string[];
};

export function isCurrentTeamSkillTarget(
  scope: SkillTargetScope,
  targetType: "digital-employee" | "project",
  targetId: string,
) {
  if (!scope.teamId || !targetId) return false;
  return (targetType === "digital-employee" ? scope.employeeIds : scope.projectIds).includes(targetId);
}
