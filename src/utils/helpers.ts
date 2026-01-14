import { Event, Workflow } from '../context/AppContext';

export function getBookingStatus(events: Event[], workflows: Workflow[]): string {
  if (!events || events.length === 0) return 'No Events';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const hasUpcomingEvents = events.some(e => e.event_date >= todayString);
  const hasPostProduction = workflows.some(w => {
    const still = Object.values(w.still_workflow || {}).some((step: any) => step.completed && !w.still_workflow?.deliveredToClient?.completed);
    const reel = Object.values(w.reel_workflow || {}).some((step: any) => step.completed && !w.reel_workflow?.reelDelivered?.completed);
    const video = Object.values(w.video_workflow || {}).some((step: any) => step.completed && !w.video_workflow?.videoDelivered?.completed);
    return still || reel || video;
  });

  const allDelivered = workflows.every(w => {
    const stillDone = w.still_workflow?.deliveredToClient?.completed;
    const reelDone = w.reel_workflow?.reelDelivered?.completed;
    const videoDone = w.video_workflow?.videoDelivered?.completed;
    return stillDone || reelDone || videoDone;
  });

  if (hasUpcomingEvents) return 'Shoot Scheduled';
  if (hasPostProduction) return 'Post-Production';
  if (allDelivered && !hasUpcomingEvents) return 'Delivered';
  return 'In Progress';
}

export function getWorkflowProgress(workflow: Workflow | undefined) {
  if (!workflow) {
    return { still: 0, reel: 0, video: 0, portrait: 0, stillTotal: 0, reelTotal: 0, videoTotal: 0, portraitTotal: 0 };
  }

  const countCompleted = (workflowSteps: Record<string, any>) => {
    const applicableSteps = Object.values(workflowSteps).filter((step: any) => !step?.notApplicable);
    return applicableSteps.filter((step: any) => step?.completed).length;
  };

  const countTotal = (workflowSteps: Record<string, any>) => {
    const applicableSteps = Object.values(workflowSteps).filter((step: any) => !step?.notApplicable);
    return applicableSteps.length;
  };

  return {
    still: countCompleted(workflow.still_workflow || {}),
    stillTotal: countTotal(workflow.still_workflow || {}),
    reel: countCompleted(workflow.reel_workflow || {}),
    reelTotal: countTotal(workflow.reel_workflow || {}),
    video: countCompleted(workflow.video_workflow || {}),
    videoTotal: countTotal(workflow.video_workflow || {}),
    portrait: countCompleted(workflow.portrait_workflow || {}),
    portraitTotal: countTotal(workflow.portrait_workflow || {}),
  };
}

export function formatDateForStorage(year: number, month: number, day: number): string {
  const y = year.toString();
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseStoredDate(dateString: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateString.split('-').map(Number);
  return { year, month: month - 1, day };
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function formatTimeSlot(timeSlot: string): string {
  const slots: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    fullDay: 'Full Day',
  };
  return slots[timeSlot] || timeSlot;
}

export function getTimeSlotBadge(timeSlot: string): string {
  const badges: Record<string, string> = {
    morning: 'M',
    afternoon: 'A',
    evening: 'E',
    fullDay: 'W',
  };
  return badges[timeSlot] || 'M';
}

export function detectConflicts(events: Event[], staffAssignments: any[], staffMembers?: any[]) {
  const conflicts: any[] = [];
  const shortages: any[] = [];

  const eventsByDateSlot = events.reduce((acc, event) => {
    const key = `${event.event_date}_${event.time_slot}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  for (const [dateSlot, eventsInSlot] of Object.entries(eventsByDateSlot)) {
    const staffInSlot: Record<string, string[]> = {};

    eventsInSlot.forEach(event => {
      const eventAssignments = staffAssignments.filter(sa => sa.event_id === event.id);
      eventAssignments.forEach(assignment => {
        if (!staffInSlot[assignment.staff_id]) {
          staffInSlot[assignment.staff_id] = [];
        }
        staffInSlot[assignment.staff_id].push(event.id);
      });
    });

    Object.entries(staffInSlot).forEach(([staffId, eventIds]) => {
      if (eventIds.length > 1) {
        conflicts.push({
          type: 'double_booking',
          severity: 'high',
          staffId,
          eventIds,
          date: eventsInSlot[0].event_date,
          timeSlot: eventsInSlot[0].time_slot,
        });
      }
    });
  }

  events.forEach(event => {
    const eventAssignments = staffAssignments.filter(sa => sa.event_id === event.id);

    const photographerCount = eventAssignments.filter(sa => {
      if (staffMembers) {
        const staffMember = staffMembers.find(s => s.id === sa.staff_id);
        return staffMember?.role === 'photographer';
      }
      return sa.role === 'photographer';
    }).length;

    const videographerCount = eventAssignments.filter(sa => {
      if (staffMembers) {
        const staffMember = staffMembers.find(s => s.id === sa.staff_id);
        return staffMember?.role === 'videographer';
      }
      return sa.role === 'videographer';
    }).length;

    const droneCount = eventAssignments.filter(sa => {
      if (staffMembers) {
        const staffMember = staffMembers.find(s => s.id === sa.staff_id);
        return staffMember?.role === 'drone_operator';
      }
      return sa.role === 'drone_operator';
    }).length;

    const editorCount = eventAssignments.filter(sa => {
      if (staffMembers) {
        const staffMember = staffMembers.find(s => s.id === sa.staff_id);
        return staffMember?.role === 'editor';
      }
      return sa.role === 'editor';
    }).length;

    if (photographerCount < event.photographers_required ||
        videographerCount < event.videographers_required ||
        droneCount < event.drone_operators_required ||
        editorCount < event.editors_required) {
      shortages.push({
        type: 'staff_shortage',
        severity: 'medium',
        eventId: event.id,
        required: {
          photographers: event.photographers_required,
          videographers: event.videographers_required,
          droneOperators: event.drone_operators_required,
          editors: event.editors_required,
        },
        assigned: {
          photographers: photographerCount,
          videographers: videographerCount,
          droneOperators: droneCount,
          editors: editorCount,
        },
      });
    }
  });

  return { conflicts, shortages };
}
