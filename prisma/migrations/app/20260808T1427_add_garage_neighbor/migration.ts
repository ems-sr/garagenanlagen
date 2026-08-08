#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/04d6949cb878c10a013bed5f27b5e6db4003f3d3e4c9e114152062dc6563dcb3/contract';
import startContract from '../../snapshots/04d6949cb878c10a013bed5f27b5e6db4003f3d3e4c9e114152062dc6563dcb3/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ac017d4dd14d9274a96fb7347e6e00a3d65dfdedac8474fbe84d19f275c9c580/contract';
import endContract from '../../snapshots/ac017d4dd14d9274a96fb7347e6e00a3d65dfdedac8474fbe84d19f275c9c580/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'garage',
        column: col('neighborGarageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'garage',
        constraint: 'garage_neighborGarageId_key',
        columns: ['neighborGarageId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garage',
        foreignKey: {
          name: 'garage_neighborGarageId_fkey',
          columns: ['neighborGarageId'],
          references: { schema: 'public', table: 'garage', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
