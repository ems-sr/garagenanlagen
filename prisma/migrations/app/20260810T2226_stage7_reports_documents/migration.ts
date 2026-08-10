#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6b98a5e9666f12087c33bf3b7cec2e1cf6bf4763d8ffc4b5caf1259a4504555c/contract';
import startContract from '../../snapshots/6b98a5e9666f12087c33bf3b7cec2e1cf6bf4763d8ffc4b5caf1259a4504555c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e56a085d9160e2b0054a6ec22762e1e11773ee6219e4eafdd2629914869489d5/contract';
import endContract from '../../snapshots/e56a085d9160e2b0054a6ec22762e1e11773ee6219e4eafdd2629914869489d5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'document',
        columns: [
          col('clubMemberId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('content', 'bytea', { notNull: true, codecRef: { codecId: 'pg/bytea@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('facilityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('uploadedByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_facilityId_idx_3710d8c1',
        columns: ['facilityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_facilityId_fkey',
          columns: ['facilityId'],
          references: { schema: 'public', table: 'facility', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
