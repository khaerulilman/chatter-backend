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
  pgm.createTable("comments", {
    id: {
      type: "varchar(21)",
      primaryKey: true,
      notNull: true,
    },
    user_id: {
      type: "varchar(21)",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    post_id: {
      type: "varchar(21)",
      notNull: true,
      references: "posts(id)",
      onDelete: "CASCADE",
    },
    content: {
      type: "text",
      notNull: true,
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Create indexes for faster lookups
  pgm.createIndex("comments", "user_id");
  pgm.createIndex("comments", "post_id");
  pgm.createIndex("comments", "created_at");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("comments");
};
