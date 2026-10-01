import { describe, it, expect, beforeEach } from 'vitest';
import { runCloudSync, initialCloudSyncState, CloudApi, CloudSyncState } from '../utils/cloudSync';
import { UserData } from '../types';

const tx = (id: string, valor = 10) =>
  ({ id, data: '2026-09-10', descricao: id, valor, tipo: 'saida', categoria: 'Lazer', paymentMethod: 'debito' }) as any;

const base = (txs: any[], extra: Partial<UserData> = {}): UserData => ({
  // Saldo já recalculado, como no app
  allData: { '2026-09': { transactions: txs, saldoFinal: -txs.reduce((sum, t) => sum + t.valor, 0) } },
  categories: { entrada: [], saida: [{ name: 'Lazer' } as any] },
  categoryColors: {}, creditCards: [], budgets: {}, savingsGoals: [],
  dashboardLayout: { order: ['resumo'], visibility: {} } as any,
  userProfile: { name: 'U', email: '', badges: [], currentStreak: 0, aiScansCount: 0 } as any,
  importHistory: [], theme: 'dark', assets: [], patrimonioHistory: [], accounts: [], subscriptions: [],
  deletedIds: {},
  lastUpdatedAt: new Date().toISOString(),
  ...extra,
});
const txIds = (d: UserData) => d.allData['2026-09'].transactions.map(t => t.id);

/** Nuvem simulada: guarda os dados (como JSON, igual ao banco) e conta as chamadas */
class FakeCloud implements CloudApi {
  stored: UserData | null = null;
  version: string | null = null;
  calls = { version: 0, full: 0, save: 0 };
  private n = 0;
  failSave = false;

  async fetchVersion() { this.calls.version++; return this.version; }
  async fetchFull() { this.calls.full++; return { data: this.stored && JSON.parse(JSON.stringify(this.stored)), updatedAt: this.version }; }
  async save(data: UserData) {
    this.calls.save++;
    if (this.failSave) return null;
    this.stored = JSON.parse(JSON.stringify(data));
    this.version = `v${++this.n}`;
    return this.version;
  }
  /** Outro aparelho grava direto na nuvem */
  otherDeviceWrites(data: UserData) { this.stored = JSON.parse(JSON.stringify(data)); this.version = `v${++this.n}`; }
}

let cloud: FakeCloud;
let state: CloudSyncState;
beforeEach(() => { cloud = new FakeCloud(); state = initialCloudSyncState(); });

describe('runCloudSync', () => {
  it('usuário novo (nuvem vazia): envia sem baixar', async () => {
    const r = await runCloudSync(base([tx('A')]), state, cloud);
    expect(r?.uploaded).toBe(true);
    expect(cloud.calls.full).toBe(0);
    expect(txIds(cloud.stored!)).toEqual(['A']);
  });

  it('primeira rodada da sessão baixa tudo uma vez', async () => {
    cloud.otherDeviceWrites(base([tx('A')]));
    const r = await runCloudSync(base([tx('A')]), state, cloud);
    expect(r?.downloaded).toBe(true);
    expect(r?.uploaded).toBe(false);
  });

  it('nuvem sem mudança e nada novo aqui: não baixa nem envia', async () => {
    await runCloudSync(base([tx('A')]), state, cloud);
    const calls = { ...cloud.calls };
    const r = await runCloudSync(base([tx('A')]), state, cloud);
    expect(r).toMatchObject({ downloaded: false, uploaded: false });
    expect(cloud.calls.full).toBe(calls.full);
    expect(cloud.calls.save).toBe(calls.save);
  });

  it('lançamento novo aqui: envia sem baixar a nuvem de novo', async () => {
    await runCloudSync(base([tx('A')]), state, cloud);
    const r = await runCloudSync(base([tx('A'), tx('B')]), state, cloud);
    expect(r).toMatchObject({ downloaded: false, uploaded: true });
    expect(cloud.calls.full).toBe(0);
    expect(txIds(cloud.stored!)).toEqual(['A', 'B']);
  });

  it('outro aparelho mudou a nuvem: baixa, junta e traz para cá', async () => {
    await runCloudSync(base([tx('A')]), state, cloud);
    cloud.otherDeviceWrites(base([tx('A'), tx('C')]));
    const r = await runCloudSync(base([tx('A'), tx('B')]), state, cloud);
    expect(r?.downloaded).toBe(true);
    expect(txIds(r!.merged)).toEqual(['A', 'B', 'C']);
    expect(txIds(cloud.stored!)).toEqual(['A', 'B', 'C']);
  });

  it('exclusão aqui chega na nuvem sem baixar', async () => {
    await runCloudSync(base([tx('A'), tx('B')]), state, cloud);
    const r = await runCloudSync(base([tx('A')], { deletedIds: { 'tx:B': new Date().toISOString() } }), state, cloud);
    expect(r).toMatchObject({ downloaded: false, uploaded: true });
    expect(txIds(cloud.stored!)).toEqual(['A']);
  });

  it('falha ao salvar: rodada abortada e a próxima tenta de novo', async () => {
    cloud.failSave = true;
    expect(await runCloudSync(base([tx('A')]), state, cloud)).toBeNull();
    cloud.failSave = false;
    const r = await runCloudSync(base([tx('A')]), state, cloud);
    expect(r?.uploaded).toBe(true);
  });

  it('cancelada no meio (usuário mexeu): não aplica nada', async () => {
    let cancel = false;
    const api: CloudApi = { ...cloud, fetchVersion: async () => { cancel = true; return null; }, fetchFull: cloud.fetchFull.bind(cloud), save: cloud.save.bind(cloud) };
    expect(await runCloudSync(base([tx('A')]), state, api, () => cancel)).toBeNull();
    expect(cloud.calls.save).toBe(0);
  });

  it('rede caiu ao consultar a nuvem: aborta sem enviar', async () => {
    const api: CloudApi = { fetchVersion: async () => { throw new Error('offline'); }, fetchFull: cloud.fetchFull.bind(cloud), save: cloud.save.bind(cloud) };
    expect(await runCloudSync(base([tx('A')]), state, api)).toBeNull();
    expect(cloud.calls.save).toBe(0);
  });
});
