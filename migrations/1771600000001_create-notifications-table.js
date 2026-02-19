/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable("notifications", {
    id: {
      type: "varchar(21)",
      primaryKey: true,
      notNull: true,
    },
    recipient_id: {
      type: "varchar(21)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    actor_id: {
      type: "varchar(21)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    type: {
      // like | comment | follow | message
      type: "varchar(20)",
      notNull: true,
    },
    entity_id: {
      // post_id for like/comment, conversation_id for message, null for follow
      type: "varchar(21)",
      notNull: false,
    },
    is_read: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Index for fast recipient queries
  pgm.createIndex("notifications", "recipient_id");
  pgm.createIndex("notifications", ["recipient_id", "is_read"]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("notifications");
};
