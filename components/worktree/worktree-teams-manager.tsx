"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  bulkUpdateEmployeeTeamAssignmentsAction,
  createTeamAction,
  updateTeamAction,
} from "@/lib/portal/actions/team-management";
import type { WorktreeEmployeeNode, WorktreeModel, WorktreeTeamNode } from "@/lib/portal/worktree";
import type { PortalRole } from "@/lib/portal/types";
import { PendingSubmitButton } from "@/components/portal/pending-submit-button";
import {
  buildDraftTeamLayout,
  moveEmployeeInDraftAssignments,
  resetDraftAssignments,
  type DraftAssignmentMap,
} from "@/components/worktree/worktree-dnd-helpers";

type AssignmentDraft = DraftAssignmentMap;
const unassignedDropId = "worktree-unassigned-pool";
const teamDropPrefix = "worktree-team:";

function buttonClass(tone: "primary" | "secondary" = "primary") {
  return tone === "primary"
    ? "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
}

function employeeName(employee: WorktreeEmployeeNode) {
  return employee.full_name || employee.email;
}

function teamName(team: WorktreeTeamNode | undefined) {
  return team?.name ?? "Unassigned";
}

function teamDropId(teamId: string) {
  return `${teamDropPrefix}${teamId}`;
}

function teamIdFromDropId(dropId: string) {
  return dropId.startsWith(teamDropPrefix) ? dropId.slice(teamDropPrefix.length) : null;
}

function EmployeeCard({
  employee,
  currentTeamName,
  changed = false,
  dragging = false,
}: {
  employee: WorktreeEmployeeNode;
  currentTeamName?: string;
  changed?: boolean;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: employee.id,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const active = dragging || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-xl border p-3 text-left shadow-sm transition active:cursor-grabbing ${
        changed ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      } ${active ? "opacity-50 ring-2 ring-blue-200" : "hover:border-blue-200"}`}
    >
      <p className="text-sm font-semibold text-slate-950">{employeeName(employee)}</p>
      <p className="mt-1 text-xs text-slate-500">{employee.job_title ?? "Employee"}</p>
      {currentTeamName ? <p className="mt-2 text-xs font-semibold text-blue-700">{currentTeamName}</p> : null}
    </div>
  );
}

function DroppableArea({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function WorktreeTeamsManager({
  model,
  role,
}: {
  model: WorktreeModel;
  role: PortalRole;
}) {
  const canManage = role === "super_admin" || role === "admin" || role === "employer_admin";
  const isAdminView = role === "super_admin" || role === "admin";
  const teams = useMemo(() => model.teams.filter((team) => !team.isFallback), [model.teams]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const validTeamIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams]);
  const serverAssignments = useMemo(
    () =>
      Object.fromEntries(
        model.assignableEmployees.map((employee) => [employee.id, employee.team_id ?? ""]),
      ) as AssignmentDraft,
    [model.assignableEmployees],
  );
  const [baselineAssignments, setBaselineAssignments] = useState<AssignmentDraft>(serverAssignments);
  const [draftAssignments, setDraftAssignments] = useState<AssignmentDraft>(serverAssignments);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const changedAssignments = useMemo(
    () =>
      model.assignableEmployees
        .map((employee) => ({
          employee,
          originalTeamId: baselineAssignments[employee.id] ?? "",
          draftTeamId: draftAssignments[employee.id] ?? "",
        }))
        .filter((assignment) => assignment.originalTeamId !== assignment.draftTeamId),
    [baselineAssignments, draftAssignments, model.assignableEmployees],
  );

  const { assignedByTeam: assignedEmployeesByTeam, unassignedEmployees } = useMemo(
    () => buildDraftTeamLayout(model.assignableEmployees, teams, draftAssignments),
    [draftAssignments, model.assignableEmployees, teams],
  );
  const activeEmployee = activeEmployeeId
    ? model.assignableEmployees.find((employee) => employee.id === activeEmployeeId) ?? null
    : null;

  function saveAssignments() {
    if (!canManage || changedAssignments.length === 0) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("employer_id", model.employer.id);
    formData.set(
      "assignments",
      JSON.stringify(
        changedAssignments.map((assignment) => ({
          employee_id: assignment.employee.id,
          team_id: assignment.draftTeamId || null,
        })),
      ),
    );

    startTransition(async () => {
      try {
        const result = await bulkUpdateEmployeeTeamAssignmentsAction(formData);
        setBaselineAssignments(resetDraftAssignments(draftAssignments));
        setMessage({ tone: "success", text: result.message });
      } catch (error) {
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Could not save team assignments.",
        });
      }
    });
  }

  function resetAssignments() {
    setDraftAssignments(resetDraftAssignments(baselineAssignments));
    setMessage(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveEmployeeId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEmployeeId(null);
    const employeeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || !model.assignableEmployees.some((employee) => employee.id === employeeId)) return;

    const targetTeamId = overId === unassignedDropId ? null : teamIdFromDropId(overId);
    if (overId !== unassignedDropId && !targetTeamId) return;

    setDraftAssignments((current) =>
      moveEmployeeInDraftAssignments(current, employeeId, targetTeamId, validTeamIds),
    );
    setMessage(null);
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Teams</h2>
        <p className="mt-1 text-sm text-slate-500">Build and manage the team structure shown in Worktree.</p>
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Team management is available to admins and employer admins only.
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Teams</h2>
          <p className="mt-1 text-sm text-slate-500">Build and manage the team structure shown in Worktree.</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {isAdminView ? "Selected employer" : "Employer"}: {model.employer.name}
          </p>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Dragging only stages changes. Click Save assignments to update the portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            changedAssignments.length > 0
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}>
            {changedAssignments.length} unsaved
          </span>
          <button
            type="button"
            onClick={saveAssignments}
            disabled={isPending || changedAssignments.length === 0}
            aria-busy={isPending}
            className={`${buttonClass()} disabled:pointer-events-none disabled:opacity-60`}
          >
            {isPending ? "Saving..." : "Save assignments"}
          </button>
          <button
            type="button"
            onClick={resetAssignments}
            disabled={isPending || changedAssignments.length === 0}
            className={`${buttonClass("secondary")} disabled:pointer-events-none disabled:opacity-60`}
          >
            Reset changes
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Create Team</h3>
        <form action={createTeamAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="employer_id" value={model.employer.id} />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Team name
            <input name="name" required className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Team manager
            <select name="manager_employee_id" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
              <option value="">Select manager</option>
              {model.assignableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeName(employee)}{employee.job_title ? ` - ${employee.job_title}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="pt-6">
            <PendingSubmitButton className={buttonClass()} pendingText="Creating...">
              Create Team
            </PendingSubmitButton>
          </div>
        </form>
      </section>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveEmployeeId(null)}>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            {teams.map((team) => {
              const managerId = team.manager?.id ?? "";
              const teamEmployees = assignedEmployeesByTeam.get(team.id) ?? [];
              return (
                <DroppableArea
                  key={team.id}
                  id={teamDropId(team.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition"
                >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{team.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Team lead: {team.manager ? employeeName(team.manager) : "Not assigned"}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {teamEmployees.length} employee{teamEmployees.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-slate-800">Edit team</summary>
                  <form action={updateTeamAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="employer_id" value={model.employer.id} />
                    <input type="hidden" name="team_id" value={team.id} />
                    <input name="name" defaultValue={team.name} required className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
                    <select name="manager_employee_id" defaultValue={managerId} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
                      <option value="">No manager</option>
                      {model.assignableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employeeName(employee)}{employee.job_title ? ` - ${employee.job_title}` : ""}
                        </option>
                      ))}
                    </select>
                    <PendingSubmitButton className={buttonClass("secondary")} pendingText="Saving...">
                      Save
                    </PendingSubmitButton>
                  </form>
                </details>

                <div className="mt-4 grid gap-2">
                  {teamEmployees.map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      currentTeamName={team.name}
                      changed={(baselineAssignments[employee.id] ?? "") !== (draftAssignments[employee.id] ?? "")}
                    />
                  ))}
                  {teamEmployees.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Drop employees here.
                    </p>
                  ) : null}
                </div>
                </DroppableArea>
              );
            })}

            {teams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
                No teams have been created yet. Create your first team to begin building the Worktree.
              </div>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Unassigned employees</h3>
              <p className="mt-1 text-sm text-slate-500">Drag employees into a team or use the dropdown.</p>
            </div>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {changedAssignments.length} unsaved
            </span>
          </div>

          {changedAssignments.length > 0 ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              You have {changedAssignments.length} unsaved team assignment changes.
            </p>
          ) : null}

          {message ? (
            <p className={`mt-4 rounded-xl border px-3 py-2 text-sm font-semibold ${
              message.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}>
              {message.text}
            </p>
          ) : null}

          <DroppableArea
            id={unassignedDropId}
            className="mt-4 grid min-h-32 gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 transition"
          >
            {unassignedEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                currentTeamName="Unassigned"
                changed={(baselineAssignments[employee.id] ?? "") !== (draftAssignments[employee.id] ?? "")}
              />
            ))}
            {unassignedEmployees.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Drop here to unassign.
              </p>
            ) : null}
          </DroppableArea>

          <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-800">Move using dropdown</summary>
            <div className="mt-4 grid gap-3">
              {model.assignableEmployees.map((employee) => {
              const draftTeamId = draftAssignments[employee.id] ?? "";
              const originalTeam = teamById.get(baselineAssignments[employee.id] ?? "");
              const draftTeam = teamById.get(draftTeamId);
              const changed = (baselineAssignments[employee.id] ?? "") !== draftTeamId;
              return (
                <div key={employee.id} className={`rounded-xl border p-3 ${changed ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-sm font-semibold text-slate-950">{employeeName(employee)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Current: {teamName(originalTeam)}{changed ? ` -> ${teamName(draftTeam)}` : ""}
                  </p>
                  <select
                    value={draftTeamId}
                    onChange={(event) =>
                      setDraftAssignments((current) => ({
                        ...current,
                        [employee.id]: event.target.value,
                      }))
                    }
                    className="mt-3 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
              })}
            </div>
          </details>

          {model.assignableEmployees.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No employees are available for assignment yet.
            </p>
          ) : null}

          {model.assignableEmployees.length > 0 && unassignedEmployees.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              All employees are currently assigned. You can still move them between teams.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAssignments}
              disabled={isPending || changedAssignments.length === 0}
              aria-busy={isPending}
              className={`${buttonClass()} disabled:pointer-events-none disabled:opacity-60`}
            >
              {isPending ? "Saving..." : "Save assignments"}
            </button>
            <button
              type="button"
              onClick={resetAssignments}
              disabled={isPending || changedAssignments.length === 0}
              className={`${buttonClass("secondary")} disabled:pointer-events-none disabled:opacity-60`}
            >
              Reset changes
            </button>
          </div>
          </aside>
        </section>
        <DragOverlay>
          {activeEmployee ? (
            <div className="w-72">
              <EmployeeCard employee={activeEmployee} currentTeamName="Moving" dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
