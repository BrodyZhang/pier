import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    name: { type: 'varchar(100)', default: '' },
    role: { type: 'varchar(20)', notNull: true, default: 'user' },
    registration_date: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    last_login_at: { type: 'timestamptz' },
  });

  pgm.createTable('verification_codes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true },
    code: { type: 'varchar(6)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('agent_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending_review' },
    rejection_reason: { type: 'text' },
    review_notes: { type: 'text' },
    review_comments: { type: 'text' },
    review_log: { type: 'jsonb', default: "'[]'::jsonb" },
    unique_slug: { type: 'uuid', unique: true },
    parent_id: { type: 'uuid', references: 'agent_requests' },
    version_number: { type: 'int', default: 1 },
    showcased: { type: 'boolean', notNull: true, default: false },
    is_public: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('agent_versions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, references: 'agent_requests', onDelete: 'CASCADE' },
    version_number: { type: 'int', notNull: true },
    request_description: { type: 'text', notNull: true },
    html_file_path: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('agent_files', {
    id: { type: 'serial', primaryKey: true },
    agent_id: { type: 'uuid', notNull: true, references: 'agent_requests', onDelete: 'CASCADE' },
    content: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('agent_shares', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    agent_id: { type: 'uuid', notNull: true, unique: true, references: 'agent_requests', onDelete: 'CASCADE' },
    partner_email: { type: 'varchar(255)', notNull: true },
    partner_user_id: { type: 'uuid', references: 'users' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createTable('user_sessions', {
    sid: { type: 'varchar', primaryKey: true },
    sess: { type: 'json', notNull: true },
    expire: { type: 'timestamp(6)', notNull: true },
  });

  pgm.createIndex('user_sessions', 'expire');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('user_sessions');
  pgm.dropTable('agent_shares');
  pgm.dropTable('agent_files');
  pgm.dropTable('agent_versions');
  pgm.dropTable('agent_requests');
  pgm.dropTable('verification_codes');
  pgm.dropTable('users');
  pgm.dropExtension('pgcrypto');
}
