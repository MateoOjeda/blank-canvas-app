import { useState } from "react";
import { motion } from "framer-motion";
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { StudentCard } from "@/components/trainer/StudentCard";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataToolbar } from "@/components/ui/data-toolbar";
import type { AvailableStudent } from "@/services/alumnos";

interface AvailableStudentsListProps {
  students: AvailableStudent[];
  isLoading: boolean;
  onLink: (id: string) => void;
  linkingId: string | null;
  itemVariants: any;
}

export function AvailableStudentsList({
  students,
  isLoading,
  onLink,
  linkingId,
  itemVariants
}: AvailableStudentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(student =>
    student.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Do not render the section at all when there are no pending students — no empty states, no reserved space.
  if (!isLoading && students.length === 0) return null;

  return (
    <motion.div variants={itemVariants}>
      <PremiumCard className="overflow-hidden">
        <PremiumCardHeader className="p-0 border-none bg-transparent">
          <DataToolbar
            searchPlaceholder="Buscar alumno para vincular..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onSearchClear={() => setSearchTerm("")}
            className="border-none shadow-none mb-0 bg-transparent rounded-none p-4 pb-2"
          />
        </PremiumCardHeader>
        
        <PremiumCardContent className="p-4 pt-1 overflow-y-auto max-h-[40vh] hide-scrollbar">
          {isLoading ? (
            <LoadingSkeleton type="list" count={3} />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              type={searchTerm ? "no-results" : "empty"}
              title={searchTerm ? "Sin coincidencias" : "Todos vinculados"}
              description={
                searchTerm
                  ? `No se encontraron alumnos disponibles que coincidan con "${searchTerm}".`
                  : "No quedan alumnos pendientes de vinculación en tu lista."
              }
            />
          ) : (
            <div className="space-y-1">
              {filteredStudents.map((student) => (
                <StudentCard
                  key={student.user_id}
                  name={student.display_name}
                  avatarUrl={student.avatar_url}
                  avatarInitials={student.avatar_initials}
                  size="sm"
                  rightContent={
                    <Button
                      size="sm" 
                      variant="outline"
                      className="gap-1 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex-shrink-0 h-8 px-3 rounded-lg text-[10px] font-bold"
                      disabled={linkingId === student.user_id}
                      onClick={() => onLink(student.user_id)}
                    >
                      {linkingId === student.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Vincular
                    </Button>
                  }
                  className="mb-1 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                />
              ))}
            </div>
          )}
        </PremiumCardContent>
      </PremiumCard>
    </motion.div>
  );
}
