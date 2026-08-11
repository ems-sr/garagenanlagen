#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/310b7eabe17d3849afb4d2bb52bd4ccd647f8bacadeafb57a00cb1a95ab403e7/contract';
import endContract from '../../snapshots/310b7eabe17d3849afb4d2bb52bd4ccd647f8bacadeafb57a00cb1a95ab403e7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/60370d21b6cc49534c1f7683d8a11388f7d884714d296779e841bb2b2de8f1a7/contract';
import startContract from '../../snapshots/60370d21b6cc49534c1f7683d8a11388f7d884714d296779e841bb2b2de8f1a7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_type_check',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'invoiceTemplate',
        constraint: 'invoiceTemplate_invoiceType_check',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_type_check',
        column: 'type',
        values: ['consumption', 'membershipFee', 'custom', 'creditNote'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoiceTemplate',
        constraint: 'invoiceTemplate_invoiceType_check',
        column: 'invoiceType',
        values: ['consumption', 'membershipFee', 'custom', 'creditNote'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
