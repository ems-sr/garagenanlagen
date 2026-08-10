#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/21bd31cd3396a52c44f152ce184437e96f26d78c5a9026c3cd486b361c6dd9fc/contract';
import startContract from '../../snapshots/21bd31cd3396a52c44f152ce184437e96f26d78c5a9026c3cd486b361c6dd9fc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e2c5e9c54f47c86d7d1010db7108a81b979fe4d557c6f64fa9ce28bfcb85300b/contract';
import endContract from '../../snapshots/e2c5e9c54f47c86d7d1010db7108a81b979fe4d557c6f64fa9ce28bfcb85300b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'invoice', column: 'previousReadingId' })];
  }
}

MigrationCLI.run(import.meta.url, M);
