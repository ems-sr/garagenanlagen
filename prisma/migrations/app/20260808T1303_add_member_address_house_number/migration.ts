#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/04d6949cb878c10a013bed5f27b5e6db4003f3d3e4c9e114152062dc6563dcb3/contract';
import endContract from '../../snapshots/04d6949cb878c10a013bed5f27b5e6db4003f3d3e4c9e114152062dc6563dcb3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/3c7389bab2fda5ed014503098af7dbe3efc2dab537500a210ed028cdb19f1f61/contract';
import startContract from '../../snapshots/3c7389bab2fda5ed014503098af7dbe3efc2dab537500a210ed028cdb19f1f61/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'memberAddress',
        column: col('houseNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
