#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/310b7eabe17d3849afb4d2bb52bd4ccd647f8bacadeafb57a00cb1a95ab403e7/contract';
import startContract from '../../snapshots/310b7eabe17d3849afb4d2bb52bd4ccd647f8bacadeafb57a00cb1a95ab403e7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/78ce6fbd83e6115e405815bbf1298bd741394d03fcc7e0ec4b382c706b214edd/contract';
import endContract from '../../snapshots/78ce6fbd83e6115e405815bbf1298bd741394d03fcc7e0ec4b382c706b214edd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_status_check',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_status_check',
        column: 'status',
        values: ['open', 'partiallyPaid', 'paid', 'canceled'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
