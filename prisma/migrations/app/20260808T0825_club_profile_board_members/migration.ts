#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/07a53e811fcd1a1a7150108e8c8ebfcb5f996587d86697e9930d7d269dbfbab0/contract';
import startContract from '../../snapshots/07a53e811fcd1a1a7150108e8c8ebfcb5f996587d86697e9930d7d269dbfbab0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f142c1f23dfa2b008df9cf70db3538255c9845d831b1abee40994b8434b07173/contract';
import endContract from '../../snapshots/f142c1f23dfa2b008df9cf70db3538255c9845d831b1abee40994b8434b07173/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'boardMember',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'clubProfile',
        column: col('accountHolder', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'clubProfile',
        column: col('bankBic', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'clubProfile',
        column: col('bankName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'clubProfile',
        column: col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'clubProfile',
        column: col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'clubProfile',
        column: col('street', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'boardMember',
        index: 'boardMember_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
