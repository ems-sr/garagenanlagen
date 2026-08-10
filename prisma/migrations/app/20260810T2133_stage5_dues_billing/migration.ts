#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b371a29eabd66442740081594e51e6ac79f96081843402e88f56823bc44cc932/contract';
import endContract from '../../snapshots/b371a29eabd66442740081594e51e6ac79f96081843402e88f56823bc44cc932/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c4603369d9dd3acf24a444cc4e2359125bda1d8fd0e7db1391de43a81f1ac59c/contract';
import startContract from '../../snapshots/c4603369d9dd3acf24a444cc4e2359125bda1d8fd0e7db1391de43a81f1ac59c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'invoiceLineItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('netAmount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitPrice', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'membershipFee',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('validFrom', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('validTo', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'invoice',
        column: col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'invoice',
        column: col('type', 'text', {
          notNull: true,
          default: lit('consumption'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.dropNotNull({ schema: 'public', table: 'invoice', column: 'consumptionKwh' }),
      this.dropNotNull({ schema: 'public', table: 'invoice', column: 'currentReadingId' }),
      this.dropNotNull({ schema: 'public', table: 'invoice', column: 'facilityId' }),
      this.dropNotNull({ schema: 'public', table: 'invoice', column: 'garageId' }),
      this.dropNotNull({ schema: 'public', table: 'invoice', column: 'pricePerKwh' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoice',
        constraint: 'invoice_type_check',
        column: 'type',
        values: ['consumption', 'membershipFee', 'custom'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceLineItem',
        index: 'invoiceLineItem_invoiceId_idx_d5c4f70e',
        columns: ['invoiceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceLineItem',
        index: 'invoiceLineItem_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membershipFee',
        index: 'membershipFee_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoiceLineItem',
        foreignKey: {
          name: 'invoiceLineItem_invoiceId_fkey',
          columns: ['invoiceId'],
          references: { schema: 'public', table: 'invoice', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
