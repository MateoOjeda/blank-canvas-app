import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLinkedStudents } from '@/hooks/useLinkedStudents';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ChunkedBatch } from '@/lib/chunking';
import { chunkArray } from '@/lib/chunking';
import { toast } from 'sonner';

export type RoutineAction = 'keep' | 'archive' | 'delete';

export interface TrainingGroup {
  id: string;
  name: string;
  trainer_id: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  previous_routine_id?: string | null;
  created_at?: string;
}

export interface GroupExercise {
  id: string;
  group_id: string;
  trainer_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  body_part?: string;
  is_to_failure: boolean;
  is_dropset?: boolean;
  is_piramide?: boolean;
  pyramid_reps?: string | null;
  exercise_type?: string;
  created_at?: string;
}

const DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

// ─── HELPER: Handle individual routine based on routineAction ───

async function handleIndividualRoutine(
  trainerId: string,
  studentId: string,
  routineAction: RoutineAction
): Promise<string | null> {
  const qRoutine = query(
    collection(db, 'routines'),
    where('trainer_id', '==', trainerId),
    where('target_type', '==', 'ALUMNO'),
    where('target_id', '==', studentId),
    where('status', '==', 'ACTIVA'),
    limit(1)
  );
  const snapRoutine = await getDocs(qRoutine);

  if (snapRoutine.empty) return null;

  const routineDoc = snapRoutine.docs[0];
  const routineId = routineDoc.id;

  switch (routineAction) {
    case 'archive':
      await updateDoc(routineDoc.ref, { status: 'ARCHIVADA' });
      break;

    case 'delete': {
      // Delete exercises first, then the routine
      const qExercises = query(
        collection(db, 'exercises'),
        where('routine_id', '==', routineId)
      );
      const snapExercises = await getDocs(qExercises);
      if (!snapExercises.empty) {
        const batch = new ChunkedBatch(db);
        snapExercises.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(routineDoc.ref);
      break;
    }

    case 'keep':
    default:
      // Do nothing — routine stays ACTIVA but won't be used while in group
      break;
  }

  return routineId;
}

/**
 * Checks if a student has an active individual routine.
 * Used by the UI to determine whether to show the routine action dialog.
 */
export async function checkStudentHasActiveRoutine(
  trainerId: string,
  studentId: string
): Promise<boolean> {
  const q = query(
    collection(db, 'routines'),
    where('trainer_id', '==', trainerId),
    where('target_type', '==', 'ALUMNO'),
    where('target_id', '==', studentId),
    where('status', '==', 'ACTIVA'),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Central hook for the unified Training Groups page.
 * Uses React Query for data fetching and caching.
 */
export function useTrainingGroups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { students, loading: loadingStudents } = useLinkedStudents();

  // UI-only state
  const [searchQuery, setSearchQuery] = useState(() =>
    localStorage.getItem('trainer_groups_search') || ''
  );
  const [newGroupName, setNewGroupName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TrainingGroup | null>(null);

  // Persist search in localStorage
  useEffect(() => {
    localStorage.setItem('trainer_groups_search', searchQuery);
  }, [searchQuery]);

  // ─── QUERIES ──────────────────────────────────────────────

  /** Fetch all groups for this trainer */
  const groupsQuery = useQuery<TrainingGroup[]>({
    queryKey: ['trainingGroups', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, 'training_groups'),
        where('trainer_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrainingGroup));
    },
    enabled: !!user?.uid,
  });

  /** Fetch ALL memberships across ALL groups in a single batch */
  const allMembershipsQuery = useQuery<GroupMember[]>({
    queryKey: ['trainingGroupMembers', user?.uid],
    queryFn: async () => {
      const groups = groupsQuery.data;
      if (!groups || groups.length === 0) return [];
      const groupIds = groups.map((g) => g.id);
      const chunks = chunkArray(groupIds, 30);
      const promises = chunks.map((chunk) =>
        getDocs(
          query(
            collection(db, 'training_group_members'),
            where('group_id', 'in', chunk)
          )
        )
      );
      const snaps = await Promise.all(promises);
      return snaps.flatMap((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupMember))
      );
    },
    enabled: !!user?.uid && (groupsQuery.data?.length ?? 0) > 0,
  });

  // ─── DERIVED STATE ────────────────────────────────────────

  const groups = groupsQuery.data || [];
  const allMembers = allMembershipsQuery.data || [];
  const loading = groupsQuery.isLoading;

  /** Map: groupId → member count */
  const memberCountByGroup = useMemo(() => {
    const map = new Map<string, number>();
    allMembers.forEach((m) => {
      map.set(m.group_id, (map.get(m.group_id) || 0) + 1);
    });
    return map;
  }, [allMembers]);

  /** Map: groupId → GroupMember[] */
  const membersByGroup = useMemo(() => {
    const map = new Map<string, GroupMember[]>();
    allMembers.forEach((m) => {
      const list = map.get(m.group_id) || [];
      list.push(m);
      map.set(m.group_id, list);
    });
    return map;
  }, [allMembers]);

  /** Set of all student IDs currently in any group */
  const groupedStudentIds = useMemo(() => {
    return new Set(allMembers.map((m) => m.student_id));
  }, [allMembers]);

  /** Students NOT assigned to any group */
  const ungroupedStudents = useMemo(() => {
    return students.filter((s) => !groupedStudentIds.has(s.user_id));
  }, [students, groupedStudentIds]);

  /** Filtered groups by search */
  const filteredGroups = useMemo(() => {
    return groups.filter((g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  /** Helper to invalidate core queries */
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['trainingGroups', user?.uid] });
    queryClient.invalidateQueries({ queryKey: ['trainingGroupMembers', user?.uid] });
  };

  // ─── MUTATIONS ────────────────────────────────────────────

  /** Create a new training group */
  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('No user');
      await addDoc(collection(db, 'training_groups'), {
        name: name.trim(),
        trainer_id: user.uid,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setNewGroupName('');
      toast.success('Grupo creado');
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al crear grupo');
    },
  });

  /** Rename an existing group */
  const renameGroupMutation = useMutation({
    mutationFn: async ({ groupId, newName }: { groupId: string; newName: string }) => {
      await updateDoc(doc(db, 'training_groups', groupId), {
        name: newName.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Grupo renombrado');
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al renombrar grupo');
    },
  });

  /** Delete a training group — moves students to "ungrouped" */
  const deleteGroupMutation = useMutation({
    mutationFn: async (group: TrainingGroup) => {
      // 1. Fetch memberships to check for restorable routines
      const qM = query(
        collection(db, 'training_group_members'),
        where('group_id', '==', group.id)
      );
      const snapM = await getDocs(qM);
      const memberDocs = snapM.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2. Delete memberships
      if (!snapM.empty) {
        const batchM = new ChunkedBatch(db);
        snapM.docs.forEach((d) => batchM.delete(d.ref));
        await batchM.commit();
      }

      // 3. Delete group exercises
      const qE = query(
        collection(db, 'group_exercises'),
        where('group_id', '==', group.id)
      );
      const snapE = await getDocs(qE);
      if (!snapE.empty) {
        const batchE = new ChunkedBatch(db);
        snapE.docs.forEach((d) => batchE.delete(d.ref));
        await batchE.commit();
      }

      // 4. Delete group routine if any
      const qR = query(
        collection(db, 'routines'),
        where('target_type', '==', 'GRUPO'),
        where('target_id', '==', group.id)
      );
      const snapR = await getDocs(qR);
      if (!snapR.empty) {
        const batchR = new ChunkedBatch(db);
        snapR.docs.forEach((d) => batchR.delete(d.ref));
        await batchR.commit();
      }

      // 5. Restore individual routines where possible
      const restorable = memberDocs.filter(
        (m: any) => m.previous_routine_id
      );
      if (restorable.length > 0) {
        const batchRestore = new ChunkedBatch(db);
        restorable.forEach((m: any) => {
          batchRestore.update(
            doc(db, 'routines', m.previous_routine_id),
            { status: 'ACTIVA' }
          );
        });
        await batchRestore.commit();
      }

      // 6. Delete the group itself
      await deleteDoc(doc(db, 'training_groups', group.id));
    },
    onSuccess: () => {
      toast.success('Grupo eliminado. Los alumnos fueron movidos a "Sin Grupo".');
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al eliminar grupo');
      setDeleteTarget(null);
    },
  });

  /**
   * Add students to a group.
   * The routineAction controls what happens to each student's individual routine:
   * - 'keep': leave it ACTIVA (but unused while in group)
   * - 'archive': set to ARCHIVADA
   * - 'delete': remove exercises + routine
   */
  const addMembersMutation = useMutation({
    mutationFn: async ({
      groupId,
      studentIds,
      routineAction,
    }: {
      groupId: string;
      studentIds: string[];
      routineAction: RoutineAction;
    }) => {
      if (!user) throw new Error('No user');

      // 1. Validate: no student should already be in a group
      for (const sid of studentIds) {
        if (groupedStudentIds.has(sid)) {
          const existingMember = allMembers.find((m) => m.student_id === sid);
          const existingGroup = groups.find(
            (g) => g.id === existingMember?.group_id
          );
          throw new Error(
            `El alumno ya pertenece al grupo "${existingGroup?.name || 'otro'}". Usa "Mover alumno" en su lugar.`
          );
        }
      }

      // 2. Handle each student's individual routine based on routineAction
      const routineIds: Record<string, string | null> = {};
      for (const sid of studentIds) {
        routineIds[sid] = await handleIndividualRoutine(
          user.uid,
          sid,
          routineAction
        );
      }

      // 3. Create membership documents
      const batch = new ChunkedBatch(db);
      for (const sid of studentIds) {
        const memberRef = doc(db, 'training_group_members', `${groupId}_${sid}`);
        batch.set(memberRef, {
          group_id: groupId,
          student_id: sid,
          previous_routine_id: routineIds[sid] || null,
          created_at: new Date().toISOString(),
        }, { merge: true });
      }
      await batch.commit();
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.studentIds.length} alumno(s) agregado(s) al grupo.`
      );
      invalidateAll();
      // Invalidate routine data for affected students
      variables.studentIds.forEach((sid) => {
        queryClient.invalidateQueries({
          queryKey: ['routineData', user?.uid, sid],
        });
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al agregar miembros');
    },
  });

  /**
   * Move a student from one group to another without touching individual routines.
   * The previous_routine_id is preserved from the original membership.
   */
  const moveStudentMutation = useMutation({
    mutationFn: async ({
      memberId,
      studentId,
      fromGroupId,
      toGroupId,
      previousRoutineId,
    }: {
      memberId: string;
      studentId: string;
      fromGroupId: string;
      toGroupId: string;
      previousRoutineId?: string | null;
    }) => {
      // 1. Delete old membership
      await deleteDoc(doc(db, 'training_group_members', memberId));

      // 2. Create new membership in target group, preserving previous_routine_id
      await setDoc(doc(db, 'training_group_members', `${toGroupId}_${studentId}`), {
        group_id: toGroupId,
        student_id: studentId,
        previous_routine_id: previousRoutineId || null,
        created_at: new Date().toISOString(),
      }, { merge: true });
    },
    onSuccess: (_, variables) => {
      const targetGroup = groups.find((g) => g.id === variables.toGroupId);
      toast.success(
        `Alumno movido al grupo "${targetGroup?.name || 'destino'}".`
      );
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al mover alumno');
    },
  });

  /** Remove a single member from a group */
  const removeMemberMutation = useMutation({
    mutationFn: async ({
      memberId,
      restoreRoutine,
      previousRoutineId,
    }: {
      memberId: string;
      restoreRoutine: boolean;
      previousRoutineId?: string | null;
    }) => {
      // 1. Delete the membership document
      await deleteDoc(doc(db, 'training_group_members', memberId));

      // 2. Restore previous routine if requested
      if (restoreRoutine && previousRoutineId) {
        try {
          await updateDoc(doc(db, 'routines', previousRoutineId), {
            status: 'ACTIVA',
          });
        } catch (err) {
          console.warn('Could not restore previous routine:', err);
        }
      }
    },
    onSuccess: () => {
      toast.success('Miembro retirado del grupo');
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al retirar miembro');
    },
  });

  // ─── CONVENIENCE HANDLERS ─────────────────────────────────

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate(newGroupName);
  };

  const deleteGroup = () => {
    if (!deleteTarget) return;
    deleteGroupMutation.mutate(deleteTarget);
  };

  /** Get members for a specific group from the cached batch */
  const getMembersForGroup = (groupId: string): GroupMember[] => {
    return membersByGroup.get(groupId) || [];
  };

  /** Get students available to be added to any group (not in ANY group) */
  const getAvailableStudentsForGroup = () => {
    return ungroupedStudents;
  };

  return {
    // State
    groups,
    loading,
    newGroupName,
    setNewGroupName,
    searchQuery,
    setSearchQuery,
    deleteTarget,
    setDeleteTarget,
    // Derived
    filteredGroups,
    allMembers,
    memberCountByGroup,
    membersByGroup,
    ungroupedStudents,
    groupedStudentIds,
    // Helpers
    getMembersForGroup,
    getAvailableStudentsForGroup,
    // Mutations
    createGroup,
    creating: createGroupMutation.isPending,
    deleteGroup,
    deleting: deleteGroupMutation.isPending,
    renameGroup: renameGroupMutation.mutateAsync,
    isRenaming: renameGroupMutation.isPending,
    addMembers: addMembersMutation.mutateAsync,
    isAddingMembers: addMembersMutation.isPending,
    moveStudent: moveStudentMutation.mutateAsync,
    isMovingStudent: moveStudentMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,
    // Dependencies
    navigate,
    loadingStudents,
    user,
    students,
  };
}

/**
 * Hook to lazily fetch exercises for a specific group.
 * Used inside each accordion item so data is only fetched when expanded.
 */
export function useGroupExercises(groupId?: string) {
  const exercisesQuery = useQuery<GroupExercise[]>({
    queryKey: ['groupExercisesDetail', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const q = query(
        collection(db, 'group_exercises'),
        where('group_id', '==', groupId)
      );
      const snap = await getDocs(q);
      const raw = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupExercise)
      );
      return [...raw].sort((a, b) => {
        const indexA = DAYS.indexOf(a.day);
        const indexB = DAYS.indexOf(b.day);
        if (indexA !== indexB) return indexA - indexB;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    exercises: exercisesQuery.data || [],
    isLoading: exercisesQuery.isLoading,
    refetch: exercisesQuery.refetch,
  };
}
