#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6b98a5e9666f12087c33bf3b7cec2e1cf6bf4763d8ffc4b5caf1259a4504555c/contract';
import endContract from '../../snapshots/6b98a5e9666f12087c33bf3b7cec2e1cf6bf4763d8ffc4b5caf1259a4504555c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b371a29eabd66442740081594e51e6ac79f96081843402e88f56823bc44cc932/contract';
import startContract from '../../snapshots/b371a29eabd66442740081594e51e6ac79f96081843402e88f56823bc44cc932/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'correspondenceLog',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('clubMemberId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('facilityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recipientEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('templateId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'emailTemplate',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'correspondenceLog',
        constraint: 'correspondenceLog_status_check',
        column: 'status',
        values: ['sent', 'failed'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'correspondenceLog',
        index: 'correspondenceLog_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'correspondenceLog',
        index: 'correspondenceLog_facilityId_idx_3710d8c1',
        columns: ['facilityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'correspondenceLog',
        index: 'correspondenceLog_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'correspondenceLog',
        index: 'correspondenceLog_templateId_idx_19e0d972',
        columns: ['templateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'emailTemplate',
        index: 'emailTemplate_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'correspondenceLog',
        foreignKey: {
          name: 'correspondenceLog_facilityId_fkey',
          columns: ['facilityId'],
          references: { schema: 'public', table: 'facility', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'correspondenceLog',
        foreignKey: {
          name: 'correspondenceLog_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'correspondenceLog',
        foreignKey: {
          name: 'correspondenceLog_templateId_fkey',
          columns: ['templateId'],
          references: { schema: 'public', table: 'emailTemplate', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
