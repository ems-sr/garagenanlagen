#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0a83ccac1e1fd5749bbe39f2c63ee85373479ea05e74c956679be80925cdf902/contract';
import endContract from '../../snapshots/0a83ccac1e1fd5749bbe39f2c63ee85373479ea05e74c956679be80925cdf902/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/1d9a12805d0ac89f5af9ba5904863f7b94f2de7f6841750a7d9938c89316a08e/contract';
import startContract from '../../snapshots/1d9a12805d0ac89f5af9ba5904863f7b94f2de7f6841750a7d9938c89316a08e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'invoice', column: 'consumptionKwh' }),
      this.dropColumn({ schema: 'public', table: 'invoice', column: 'pricePerKwh' }),
      this.dropConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_currentReadingId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_previousReadingId_fkey',
        kind: 'foreignKey',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'invoice',
        index: 'invoice_previousReadingId_idx_cbaf49d5',
      }),
      this.dropColumn({ schema: 'public', table: 'invoice', column: 'previousReadingId' }),
      this.dropConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_currentReadingId_key',
      }),
      this.dropColumn({ schema: 'public', table: 'invoice', column: 'currentReadingId' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
