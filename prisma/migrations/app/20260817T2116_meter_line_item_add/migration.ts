#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1d9a12805d0ac89f5af9ba5904863f7b94f2de7f6841750a7d9938c89316a08e/contract';
import endContract from '../../snapshots/1d9a12805d0ac89f5af9ba5904863f7b94f2de7f6841750a7d9938c89316a08e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/78ce6fbd83e6115e405815bbf1298bd741394d03fcc7e0ec4b382c706b214edd/contract';
import startContract from '../../snapshots/78ce6fbd83e6115e405815bbf1298bd741394d03fcc7e0ec4b382c706b214edd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'meterLineItem',
        columns: [
          col('consumptionKwh', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('currentReadingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lineItemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('previousReadingId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('pricePerKwh', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'meterLineItem',
        constraint: 'meterLineItem_lineItemId_key',
        columns: ['lineItemId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'meterLineItem',
        constraint: 'meterLineItem_currentReadingId_key',
        columns: ['currentReadingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'meterLineItem',
        index: 'meterLineItem_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'meterLineItem',
        index: 'meterLineItem_previousReadingId_idx_cbaf49d5',
        columns: ['previousReadingId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'meterLineItem',
        foreignKey: {
          name: 'meterLineItem_lineItemId_fkey',
          columns: ['lineItemId'],
          references: { schema: 'public', table: 'invoiceLineItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'meterLineItem',
        foreignKey: {
          name: 'meterLineItem_previousReadingId_fkey',
          columns: ['previousReadingId'],
          references: { schema: 'public', table: 'meterReading', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'meterLineItem',
        foreignKey: {
          name: 'meterLineItem_currentReadingId_fkey',
          columns: ['currentReadingId'],
          references: { schema: 'public', table: 'meterReading', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
