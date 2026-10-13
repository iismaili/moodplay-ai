export interface VisitorSession {
  id: number;
  startedAt: number;
}

export function createVisitorSession(now: number, id = 1): VisitorSession {
  return { id, startedAt: now };
}

export function rotateVisitor(session: VisitorSession, now: number): VisitorSession {
  return { id: session.id + 1, startedAt: now };
}
