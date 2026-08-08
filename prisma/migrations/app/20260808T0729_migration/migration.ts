#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/07a53e811fcd1a1a7150108e8c8ebfcb5f996587d86697e9930d7d269dbfbab0/contract';
import endContract from '../../snapshots/07a53e811fcd1a1a7150108e8c8ebfcb5f996587d86697e9930d7d269dbfbab0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/faa7d64f9587a49a69f1ebcd41b56d1d3ff5235ec228c43a455c1f167d519a1f/contract';
import startContract from '../../snapshots/faa7d64f9587a49a69f1ebcd41b56d1d3ff5235ec228c43a455c1f167d519a1f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'garagenanlage' }),
      this.dropTable({ schema: 'public', table: 'vereinProfile' }),
      this.createTable({
        schema: 'public',
        table: 'block',
        columns: [
          col('constructionSectionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('facilityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'clubMember',
        columns: [
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('street', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'clubProfile',
        columns: [
          col('bankIban', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'constructionSection',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('facilityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'facility',
        columns: [
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('street', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'garage',
        columns: [
          col('blockId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('constructionSectionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('facilityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('meterNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'garageAssignment',
        columns: [
          col('clubMemberId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('garageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('garageUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('validFrom', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('validTo', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'garageUser',
        columns: [
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('street', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'membershipPeriod',
        columns: [
          col('clubMemberId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('endDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
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
        table: 'tenant',
        columns: [
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('street', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'clubProfile',
        constraint: 'clubProfile_organizationId_key',
        columns: ['organizationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'garage',
        constraint: 'garage_facilityId_number_key',
        columns: ['facilityId', 'number'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'garage',
        constraint: 'garage_type_check',
        column: 'type',
        values: ['single', 'double'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'garageAssignment',
        constraint: 'garageAssignment_type_check',
        column: 'type',
        values: ['member', 'user', 'tenant'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'block',
        index: 'block_constructionSectionId_idx_2e092d97',
        columns: ['constructionSectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'block',
        index: 'block_facilityId_idx_3710d8c1',
        columns: ['facilityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'block',
        index: 'block_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'clubMember',
        index: 'clubMember_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionSection',
        index: 'constructionSection_facilityId_idx_3710d8c1',
        columns: ['facilityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'constructionSection',
        index: 'constructionSection_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'facility',
        index: 'facility_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garage',
        index: 'garage_blockId_idx_5a8da344',
        columns: ['blockId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garage',
        index: 'garage_constructionSectionId_idx_2e092d97',
        columns: ['constructionSectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garage',
        index: 'garage_facilityId_idx_3710d8c1',
        columns: ['facilityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garage',
        index: 'garage_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAssignment',
        index: 'garageAssignment_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAssignment',
        index: 'garageAssignment_garageId_idx_3676c979',
        columns: ['garageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAssignment',
        index: 'garageAssignment_garageUserId_idx_670c732a',
        columns: ['garageUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAssignment',
        index: 'garageAssignment_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageAssignment',
        index: 'garageAssignment_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'garageUser',
        index: 'garageUser_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membershipPeriod',
        index: 'membershipPeriod_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'membershipPeriod',
        index: 'membershipPeriod_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenant',
        index: 'tenant_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'block',
        foreignKey: {
          name: 'block_facilityId_fkey',
          columns: ['facilityId'],
          references: { schema: 'public', table: 'facility', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'block',
        foreignKey: {
          name: 'block_constructionSectionId_fkey',
          columns: ['constructionSectionId'],
          references: { schema: 'public', table: 'constructionSection', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'constructionSection',
        foreignKey: {
          name: 'constructionSection_facilityId_fkey',
          columns: ['facilityId'],
          references: { schema: 'public', table: 'facility', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garage',
        foreignKey: {
          name: 'garage_facilityId_fkey',
          columns: ['facilityId'],
          references: { schema: 'public', table: 'facility', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garage',
        foreignKey: {
          name: 'garage_constructionSectionId_fkey',
          columns: ['constructionSectionId'],
          references: { schema: 'public', table: 'constructionSection', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garage',
        foreignKey: {
          name: 'garage_blockId_fkey',
          columns: ['blockId'],
          references: { schema: 'public', table: 'block', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageAssignment',
        foreignKey: {
          name: 'garageAssignment_garageId_fkey',
          columns: ['garageId'],
          references: { schema: 'public', table: 'garage', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageAssignment',
        foreignKey: {
          name: 'garageAssignment_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageAssignment',
        foreignKey: {
          name: 'garageAssignment_garageUserId_fkey',
          columns: ['garageUserId'],
          references: { schema: 'public', table: 'garageUser', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'garageAssignment',
        foreignKey: {
          name: 'garageAssignment_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'membershipPeriod',
        foreignKey: {
          name: 'membershipPeriod_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
