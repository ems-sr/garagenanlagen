#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3c7389bab2fda5ed014503098af7dbe3efc2dab537500a210ed028cdb19f1f61/contract';
import endContract from '../../snapshots/3c7389bab2fda5ed014503098af7dbe3efc2dab537500a210ed028cdb19f1f61/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f142c1f23dfa2b008df9cf70db3538255c9845d831b1abee40994b8434b07173/contract';
import startContract from '../../snapshots/f142c1f23dfa2b008df9cf70db3538255c9845d831b1abee40994b8434b07173/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'memberAddress',
        columns: [
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clubMemberId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('street', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'memberContact',
        columns: [
          col('clubMemberId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'memberAddress',
        constraint: 'memberAddress_type_check',
        column: 'type',
        values: ['home', 'billing', 'other'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'memberContact',
        constraint: 'memberContact_type_check',
        column: 'type',
        values: ['email', 'phone', 'mobile', 'fax', 'other'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberAddress',
        index: 'memberAddress_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberAddress',
        index: 'memberAddress_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberContact',
        index: 'memberContact_clubMemberId_idx_363aef22',
        columns: ['clubMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberContact',
        index: 'memberContact_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memberAddress',
        foreignKey: {
          name: 'memberAddress_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memberContact',
        foreignKey: {
          name: 'memberContact_clubMemberId_fkey',
          columns: ['clubMemberId'],
          references: { schema: 'public', table: 'clubMember', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
