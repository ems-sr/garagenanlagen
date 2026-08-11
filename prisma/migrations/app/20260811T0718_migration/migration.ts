#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/16aa3fbb6f48da7046ac15949467613bf2aa24bfa5a0090bdf32388ab0420c8d/contract';
import startContract from '../../snapshots/16aa3fbb6f48da7046ac15949467613bf2aa24bfa5a0090bdf32388ab0420c8d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/60370d21b6cc49534c1f7683d8a11388f7d884714d296779e841bb2b2de8f1a7/contract';
import endContract from '../../snapshots/60370d21b6cc49534c1f7683d8a11388f7d884714d296779e841bb2b2de8f1a7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'invoiceTemplate',
        columns: [
          col('autoGenerate', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceTemplateId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lineItemTypeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('overrideAmount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'lineItemType',
        columns: [
          col('amountSource', 'text', {
            notNull: true,
            default: lit('fixed'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('defaultAmount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'workShiftDepositAmount',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
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
        table: 'workShift',
        column: col('reimbursementUnit', 'text', {
          notNull: true,
          default: lit('hourly'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        constraint: 'invoiceTemplateLineItem_invoiceTemplateId_lineItemTypeId_key',
        columns: ['invoiceTemplateId', 'lineItemTypeId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoiceTemplate',
        constraint: 'invoiceTemplate_invoiceType_check',
        column: 'invoiceType',
        values: ['consumption', 'membershipFee', 'custom'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'lineItemType',
        constraint: 'lineItemType_amountSource_check',
        column: 'amountSource',
        values: ['fixed', 'membershipFeeRate', 'workShiftDepositRate'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workShift',
        constraint: 'workShift_reimbursementUnit_check',
        column: 'reimbursementUnit',
        values: ['hourly', 'fixed'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceTemplate',
        index: 'invoiceTemplate_invoiceType_idx_cc224f0e',
        columns: ['invoiceType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceTemplate',
        index: 'invoiceTemplate_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        index: 'invoiceTemplateLineItem_invoiceTemplateId_idx_c37ee64d',
        columns: ['invoiceTemplateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        index: 'invoiceTemplateLineItem_lineItemTypeId_idx_580140ff',
        columns: ['lineItemTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        index: 'invoiceTemplateLineItem_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lineItemType',
        index: 'lineItemType_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workShiftDepositAmount',
        index: 'workShiftDepositAmount_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        foreignKey: {
          name: 'invoiceTemplateLineItem_invoiceTemplateId_fkey',
          columns: ['invoiceTemplateId'],
          references: { schema: 'public', table: 'invoiceTemplate', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoiceTemplateLineItem',
        foreignKey: {
          name: 'invoiceTemplateLineItem_lineItemTypeId_fkey',
          columns: ['lineItemTypeId'],
          references: { schema: 'public', table: 'lineItemType', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
