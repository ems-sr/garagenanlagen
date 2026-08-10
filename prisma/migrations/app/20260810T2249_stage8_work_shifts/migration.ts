#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5456f7df4f020b3d92d1d91a7c1340eb9d734e63effe37e7b9d1580a46e4702d/contract';
import endContract from '../../snapshots/5456f7df4f020b3d92d1d91a7c1340eb9d734e63effe37e7b9d1580a46e4702d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e56a085d9160e2b0054a6ec22762e1e11773ee6219e4eafdd2629914869489d5/contract';
import startContract from '../../snapshots/e56a085d9160e2b0054a6ec22762e1e11773ee6219e4eafdd2629914869489d5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'shiftParticipant',
        columns: [
          col('clubMemberId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('hoursWorked', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paidOut', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('paidOutAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
          col('reimbursementAmount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('workShiftId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'workShift',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('date', 'timestamptz', { notNull: true, codecRef: { codecId: 'pg/timestamptz@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('facilityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'workShiftReimbursementRate',
        columns: [
          col('amountPerHour', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
      this.addUnique({
        schema: 'public',
        table: 'shiftParticipant',
        constraint: 'shiftParticipant_workShiftId_clubMemberId_key',
        columns: ['workShiftId', 'clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftParticipant',
        index: 'shiftParticipant_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftParticipant',
        index: 'shiftParticipant_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftParticipant',
        index: 'shiftParticipant_workShiftId_idx_6d239a0e',
        columns: ['workShiftId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workShift',
        index: 'workShift_facilityId_idx_3710d8c1',
        columns: ['facilityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workShift',
        index: 'workShift_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'workShiftReimbursementRate',
        index: 'workShiftReimbursementRate_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftParticipant',
        foreignKey: {
          name: 'shiftParticipant_workShiftId_fkey',
          columns: ['workShiftId'],
          references: { schema: 'public', table: 'workShift', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftParticipant',
        foreignKey: {
          name: 'shiftParticipant_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'workShift',
        foreignKey: {
          name: 'workShift_facilityId_fkey',
          columns: ['facilityId'],
          references: { schema: 'public', table: 'facility', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
