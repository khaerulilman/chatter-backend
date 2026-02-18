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
  pgm.createTable("follows", {
    id: {
      type: "varchar(21)",
      primaryKey: true,
      notNull: true,
    },
    follower_id: {
      type: "varchar(21)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    following_id: {
      type: "varchar(21)",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Unique constraint: a user can only follow another user once
  pgm.addConstraint("follows", "unique_follow", {
    unique: ["follower_id", "following_id"],
  });

  // Prevent self-following
  pgm.addConstraint("follows", "no_self_follow", {
    check: "follower_id <> following_id",
  });

  // Index for faster queries
  pgm.createIndex("follows", "follower_id");
  pgm.createIndex("follows", "following_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("follows");
};
