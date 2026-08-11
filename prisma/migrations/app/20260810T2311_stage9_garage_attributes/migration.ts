#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/16aa3fbb6f48da7046ac15949467613bf2aa24bfa5a0090bdf32388ab0420c8d/contract';
import endContract from '../../snapshots/16aa3fbb6f48da7046ac15949467613bf2aa24bfa5a0090bdf32388ab0420c8d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5456f7df4f020b3d92d1d91a7c1340eb9d734e63effe37e7b9d1580a46e4702d/contract';
import startContract from '../../snapshots/5456f7df4f020b3d92d1d91a7c1340eb9d734e63effe37e7b9d1580a46e4702d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'garageAttributeAssignment',
        columns: [
          col('attributeTypeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('garageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'garageAttributeType',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('dataType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'garageUsageEvent',
        columns: [
          col('clubMemberId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('garageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('occurredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'garageAttributeAssignment',
        constraint: 'garageAttributeAssignment_garageId_attributeTypeId_key',
        columns: ['garageId', 'attributeTypeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'garageAttributeType',
        constraint: 'garageAttributeType_organizationId_name_key',
        columns: ['organizationId', 'name'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'garageAttributeType',
        constraint: 'garageAttributeType_dataType_check',
        column: 'dataType',
        values: ['text', 'number', 'boolean'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'garageUsageEvent',
        constraint: 'garageUsageEvent_eventType_check',
        column: 'eventType',
        values: ['assignmentStarted', 'assignmentEnded', 'note'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAttributeAssignment',
        index: 'garageAttributeAssignment_attributeTypeId_idx_03c18f36',
        columns: ['attributeTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAttributeAssignment',
        index: 'garageAttributeAssignment_garageId_idx_3676c979',
        columns: ['garageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAttributeAssignment',
        index: 'garageAttributeAssignment_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAttributeType',
        index: 'garageAttributeType_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageUsageEvent',
        index: 'garageUsageEvent_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageUsageEvent',
        index: 'garageUsageEvent_garageId_idx_3676c979',
        columns: ['garageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageUsageEvent',
        index: 'garageUsageEvent_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageAttributeAssignment',
        foreignKey: {
          name: 'garageAttributeAssignment_garageId_fkey',
          columns: ['garageId'],
          references: { schema: 'public', table: 'garage', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageAttributeAssignment',
        foreignKey: {
          name: 'garageAttributeAssignment_attributeTypeId_fkey',
          columns: ['attributeTypeId'],
          references: { schema: 'public', table: 'garageAttributeType', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageUsageEvent',
        foreignKey: {
          name: 'garageUsageEvent_garageId_fkey',
          columns: ['garageId'],
          references: { schema: 'public', table: 'garage', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageUsageEvent',
        foreignKey: {
          name: 'garageUsageEvent_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
