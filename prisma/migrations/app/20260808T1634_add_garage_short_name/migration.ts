#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0b3c7eb8de830652a325c493f8bbabfc77db69a5927842a13c4fb12f01b9e4e7/contract';
import startContract from '../../snapshots/0b3c7eb8de830652a325c493f8bbabfc77db69a5927842a13c4fb12f01b9e4e7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6eb5c9fcd5b5c10d8a0356f91dd6eb0972a78c9ed5def0898dfa3a4f23eb6afc/contract';
import endContract from '../../snapshots/6eb5c9fcd5b5c10d8a0356f91dd6eb0972a78c9ed5def0898dfa3a4f23eb6afc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'garage',
        column: col('shortName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
