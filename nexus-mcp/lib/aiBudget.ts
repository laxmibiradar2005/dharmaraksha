import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export class BudgetError extends Error {}
export class BudgetLedger {
  private db: Database.Database;
  constructor(filename: string) {
    if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.exec('CREATE TABLE IF NOT EXISTS reservations(id INTEGER PRIMARY KEY, cycle TEXT NOT NULL, provider TEXT NOT NULL, inr REAL NOT NULL, created_at TEXT NOT NULL)');
  }
  reserve(provider: string, inr: number, cycle = process.env.AI_BUDGET_CYCLE || 'prototype', total = Number(process.env.AI_BUDGET_INR || 400), daily = Number(process.env.AI_DAILY_BUDGET_INR || 20), now = new Date()) {
    if (![inr, total, daily].every(Number.isFinite) || inr <= 0 || total < 0 || daily < 0) throw new BudgetError('Invalid AI spending configuration.');
    this.db.transaction(() => {
      const sum = (where: string, ...params: string[]) => (this.db.prepare(`SELECT COALESCE(SUM(inr),0) AS amount FROM reservations WHERE cycle = ? ${where}`).get(cycle, ...params) as { amount: number }).amount;
      const minute = new Date(now.getTime() - 60000).toISOString();
      const count = (this.db.prepare('SELECT COUNT(*) AS n FROM reservations WHERE created_at >= ?').get(minute) as { n: number }).n;
      if (count >= 12) throw new BudgetError('Please wait a minute before another AI request.');
      if (sum('') + inr > total || sum('AND created_at >= ?', now.toISOString().slice(0, 10)) + inr > daily) throw new BudgetError('The local AI spending limit has been reached. Local law search remains free.');
      this.db.prepare('INSERT INTO reservations(cycle,provider,inr,created_at) VALUES (?,?,?,?)').run(cycle, provider, inr, now.toISOString());
    }).immediate();
  }
  status() {
    const cycle = process.env.AI_BUDGET_CYCLE || 'prototype';
    const rows = this.db.prepare('SELECT provider, ROUND(SUM(inr),4) AS reservedInr, COUNT(*) AS requests FROM reservations WHERE cycle = ? GROUP BY provider').all(cycle);
    return { cycle, ceilingInr: Number(process.env.AI_BUDGET_INR || 400), dailyCeilingInr: Number(process.env.AI_DAILY_BUDGET_INR || 20), accounting: 'Conservative local reservations, not your provider balance. Failed requests remain reserved; other apps are not counted.', providers: rows };
  }
  close() { this.db.close(); }
}
let ledger: BudgetLedger | undefined;
export function aiBudget() { return ledger ||= new BudgetLedger(process.env.AI_BUDGET_DB || path.join(process.cwd(), 'data/private/ai-budget.sqlite')); }
