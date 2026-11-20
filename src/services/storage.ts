import {api} from './accountApi';
import type { GameSession, QuestionnaireSession, MRIResult } from "../types";
type Workspace = { id: string; user: string; values: Record<string, unknown>; confirmed: Record<string, unknown>; revisions: Map<string, number> };
let workspace: Workspace | null = null;
let pending: Promise<void> = Promise.resolve();
const selectionKey = "neura.activeParticipant";
export function activeParticipant() { return workspace?.id || ""; }
export async function selectParticipant(id: string) {
  await pending;
  if (!id) {
    workspace = null;
    sessionStorage.removeItem(selectionKey);
    return;
  }
  const response = await fetch(`/api/participants/${encodeURIComponent(id)}/workspace`);
  if (!response.ok) throw Object.assign(new Error("Не удалось открыть карточку участника"),{status:response.status});
  const { user, values } = await response.json();
  workspace = { id, user, values, confirmed: { ...values }, revisions: new Map() };
  sessionStorage.setItem(selectionKey, id);
}
export async function openAnalysisWorkspace(userId:string) {
  await pending;
  if (workspace?.user === userId) return;
  const selected=sessionStorage.getItem(selectionKey);
  if (selected) {
    try { await selectParticipant(selected); return; }
    catch (error) {
      if (![403,404].includes((error as {status:number}).status)) throw error;
    }
  }
  const {id}=await api<{id:string}>('/personal-card',{});
  await selectParticipant(id);
}
export function read<T>(key: string, fallback: T): T {
  if (workspace) return (workspace.values[key] as T) ?? fallback;
  return fallback;
}
export function write<T>(key: string, value: T) {
  if (workspace) {
    const target = workspace;
    const { id, user } = target;
    const revision = (target.revisions.get(key) ?? 0) + 1;
    target.revisions.set(key, revision);
    const body = JSON.stringify({ key, value, user });
    workspace.values[key] = value;
    const result = pending.then(async () => {
      const response = await fetch(`/api/participants/${id}/workspace`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Neura-Request": "1" }, body,
      });
      if (!response.ok) throw new Error("save");
      target.confirmed[key] = value;
      return true;
    }).catch(() => {
      if (target.revisions.get(key) === revision) target.values[key] = target.confirmed[key];
      window.dispatchEvent(new Event("neura-storage-error"));
      return false;
    });
    pending = result.then(() => {});
    return result;
  }
  window.dispatchEvent(new Event("neura-storage-error"));
  return false;
}
export const service = {
  game: () => read<GameSession | null>("game", null),
  saveGame: (value: GameSession) => write("game", value),
  questionnaire: () =>
    read<QuestionnaireSession>("questionnaire", { answers: {} }),
  saveQuestionnaire: (value: QuestionnaireSession) =>
    write("questionnaire", value),
  mri: () => read<MRIResult[]>("mri", []),
  saveMRI: (value: MRIResult) =>
    write("mri", [value, ...service.mri()].slice(0, 20)),
  async overview() {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      game: service.game(),
      questionnaire: service.questionnaire(),
      mri: service.mri(),
    };
  },
};
export function summarize(session: GameSession) {
  return {
    seconds: session.answers.reduce((n, a) => n + a.seconds, 0),
    changes: session.answers.reduce((n, a) => n + a.changes, 0),
    help: session.answers.reduce((n, a) => n + a.help, 0),
  };
}
