import { useState } from "react";
import { useTrainingGroups, checkStudentHasActiveRoutine } from "@/hooks/trainer/useTrainingGroups";
import type { TrainingGroup, RoutineAction } from "@/hooks/trainer/useTrainingGroups";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { SearchInput } from "@/components/ui/search-input";
import { Separator } from "@/components/ui/separator";
import { Accordion } from "@/components/ui/accordion";
import { CreateGroupForm } from "@/components/trainer/training-groups/CreateGroupForm";
import { DeleteGroupDialog } from "@/components/trainer/training-groups/DeleteGroupDialog";
import { RenameGroupDialog } from "@/components/trainer/training-groups/RenameGroupDialog";
import { AddToGroupDialog } from "@/components/trainer/training-groups/AddToGroupDialog";
import { MoveStudentDialog } from "@/components/trainer/training-groups/MoveStudentDialog";
import { GroupAccordionItem } from "@/components/trainer/training-groups/GroupAccordionItem";
import { UngroupedStudentCard } from "@/components/trainer/training-groups/UngroupedStudentCard";
import { UnifiedGroupsKpiCards } from "@/components/trainer/training-groups/UnifiedGroupsKpiCards";
import { UserX } from "lucide-react";

export default function TrainingGroupsPage() {
  const {
    groups,
    loading,
    newGroupName,
    setNewGroupName,
    searchQuery,
    setSearchQuery,
    creating,
    deleteTarget,
    setDeleteTarget,
    deleting,
    filteredGroups,
    allMembers,
    memberCountByGroup,
    ungroupedStudents,
    getMembersForGroup,
    getAvailableStudentsForGroup,
    createGroup,
    deleteGroup,
    renameGroup,
    isRenaming,
    addMembers,
    isAddingMembers,
    moveStudent,
    isMovingStudent,
    removeMember,
    isRemovingMember,
    navigate,
    students,
    user,
  } = useTrainingGroups();

  // ── Accordion state
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // ── Rename dialog state
  const [renameTarget, setRenameTarget] = useState<TrainingGroup | null>(null);

  // ── Add to group dialog state (for ungrouped students)
  const [addToGroupTarget, setAddToGroupTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [addToGroupHasRoutine, setAddToGroupHasRoutine] = useState(false);

  // ── Move student dialog state
  const [moveTarget, setMoveTarget] = useState<{
    memberId: string;
    studentId: string;
    groupId: string;
    groupName: string;
    previousRoutineId?: string | null;
  } | null>(null);

  // ── Handlers ──────────────────────────────────────────────

  const handleRename = async (newName: string) => {
    if (!renameTarget) return;
    await renameGroup({ groupId: renameTarget.id, newName });
  };

  const handleNavigateToRoutine = (groupId: string) => {
    navigate(`/trainer/groups/${groupId}/routine`);
  };

  const handleViewNutrition = (studentId: string) => {
    navigate(`/trainer/students/${studentId}?tab=alimentacion`);
  };

  const handleViewProgress = (studentId: string) => {
    navigate(`/trainer/students/${studentId}?tab=seguimiento`);
  };

  const handleAddStudentsFromAccordion = (groupId: string, studentIds: string[]) => {
    // For inline add from accordion, archive by default (no dialog needed since these are ungrouped)
    addMembers({ groupId, studentIds, routineAction: "archive" as RoutineAction });
  };

  const handleAddToGroupFromCard = async (studentId: string) => {
    const student = students.find((s) => s.user_id === studentId);
    if (!student || !user) return;

    // Check if student has an active routine before showing the dialog
    const hasRoutine = await checkStudentHasActiveRoutine(user.uid, studentId);
    setAddToGroupHasRoutine(hasRoutine);
    setAddToGroupTarget({
      studentId,
      studentName: student.display_name || "Alumno",
    });
  };

  const handleAddToGroupConfirm = async (
    groupId: string,
    studentIds: string[],
    routineAction: RoutineAction
  ) => {
    await addMembers({ groupId, studentIds, routineAction });
  };

  const handleMoveStudent = (memberId: string, studentId: string) => {
    // Find current group
    const member = allMembers.find((m) => m.id === memberId);
    if (!member) return;
    const group = groups.find((g) => g.id === member.group_id);
    if (!group) return;

    setMoveTarget({
      memberId,
      studentId,
      groupId: group.id,
      groupName: group.name,
      previousRoutineId: member.previous_routine_id,
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = allMembers.find((m) => m.id === memberId);
    await removeMember({
      memberId,
      restoreRoutine: true,
      previousRoutineId: member?.previous_routine_id,
    });
  };

  const handleEditRoutineIndividual = (studentId: string) => {
    navigate(`/trainer/groups/student/${studentId}/routine`);
  };

  const handleViewRoutineIndividual = (studentId: string) => {
    navigate(`/trainer/students/${studentId}?tab=rutinas`);
  };

  // ─── RENDER ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto pb-24 space-y-6">
        <LoadingSkeleton type="cards" count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Grupos de Entrenamiento"
        description="Administra grupos, rutinas colectivas y alumnos desde un solo lugar."
      />

      {/* KPIs */}
      <UnifiedGroupsKpiCards
        groups={groups}
        totalGroupedStudents={allMembers.length}
        totalUngroupedStudents={ungroupedStudents.length}
      />

      {/* Create Group */}
      <CreateGroupForm
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        creating={creating}
        createGroup={createGroup}
      />

      {/* Search */}
      {groups.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
            Mis Grupos ({filteredGroups.length})
          </h2>
          <div className="max-w-sm">
            <SearchInput
              placeholder="Buscar grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              className="h-8.5 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Groups Accordion */}
      {filteredGroups.length === 0 && groups.length > 0 ? (
        <EmptyState
          type="no-results"
          title="Sin coincidencias"
          description="No se encontraron grupos que coincidan con tu búsqueda."
          className="py-6 min-h-[150px]"
        />
      ) : groups.length === 0 ? null : (
        <Accordion
          type="multiple"
          value={expandedGroups}
          onValueChange={setExpandedGroups}
          className="space-y-3"
        >
          {filteredGroups.map((group) => (
            <GroupAccordionItem
              key={group.id}
              group={group}
              members={getMembersForGroup(group.id)}
              students={students}
              ungroupedStudents={ungroupedStudents}
              isExpanded={expandedGroups.includes(group.id)}
              onRename={(g) => setRenameTarget(g)}
              onDelete={(g) => setDeleteTarget(g)}
              onAddStudents={handleAddStudentsFromAccordion}
              onRemoveMember={handleRemoveMember}
              onMoveStudent={handleMoveStudent}
              onNavigateToRoutine={handleNavigateToRoutine}
              onViewNutrition={handleViewNutrition}
              onViewProgress={handleViewProgress}
            />
          ))}
        </Accordion>
      )}

      {/* ═══ ALUMNOS SIN GRUPO ═══ */}
      {ungroupedStudents.length > 0 && (
        <>
          <Separator className="my-6" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-500" />
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Alumnos Sin Grupo ({ungroupedStudents.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ungroupedStudents.map((student) => (
                <UngroupedStudentCard
                  key={student.user_id}
                  student={student}
                  onViewRoutine={handleViewRoutineIndividual}
                  onEditRoutine={handleEditRoutineIndividual}
                  onViewNutrition={handleViewNutrition}
                  onEditNutrition={handleViewNutrition}
                  onViewProgress={handleViewProgress}
                  onAddToGroup={handleAddToGroupFromCard}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── DIALOGS ── */}
      <DeleteGroupDialog
        deleteTarget={deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={deleteGroup}
        deleting={deleting}
      />

      <RenameGroupDialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        currentName={renameTarget?.name || ""}
        onConfirm={handleRename}
        isRenaming={isRenaming}
      />

      {addToGroupTarget && (
        <AddToGroupDialog
          open={!!addToGroupTarget}
          onOpenChange={(open) => !open && setAddToGroupTarget(null)}
          studentName={addToGroupTarget.studentName}
          studentId={addToGroupTarget.studentId}
          groups={groups}
          hasActiveRoutine={addToGroupHasRoutine}
          onConfirm={handleAddToGroupConfirm}
          isAdding={isAddingMembers}
        />
      )}

      {moveTarget && (
        <MoveStudentDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          studentName={
            students.find((s) => s.user_id === moveTarget.studentId)?.display_name || "Alumno"
          }
          currentGroupName={moveTarget.groupName}
          currentGroupId={moveTarget.groupId}
          memberId={moveTarget.memberId}
          studentId={moveTarget.studentId}
          previousRoutineId={moveTarget.previousRoutineId}
          availableGroups={groups}
          onConfirm={moveStudent}
          isMoving={isMovingStudent}
        />
      )}
    </div>
  );
}
