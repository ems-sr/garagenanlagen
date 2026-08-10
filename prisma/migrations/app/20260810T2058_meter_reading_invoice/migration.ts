#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c4603369d9dd3acf24a444cc4e2359125bda1d8fd0e7db1391de43a81f1ac59c/contract';
import endContract from '../../snapshots/c4603369d9dd3acf24a444cc4e2359125bda1d8fd0e7db1391de43a81f1ac59c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e2c5e9c54f47c86d7d1010db7108a81b979fe4d557c6f64fa9ce28bfcb85300b/contract';
import startContract from '../../snapshots/e2c5e9c54f47c86d7d1010db7108a81b979fe4d557c6f64fa9ce28bfcb85300b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'meterReading',
        column: col('invoiceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'meterReading',
        index: 'meterReading_invoiceId_idx_d5c4f70e',
        columns: ['invoiceId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'meterReading',
        foreignKey: {
          name: 'meterReading_invoiceId_fkey',
          columns: ['invoiceId'],
          references: { schema: 'public', table: 'invoice', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
