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
  pgm.createTable("conversation_members", {
    conversation_id: {
      type: "varchar(21)",
      notNull: true,
      references: "conversations(id)",
      onDelete: "CASCADE",
    },
    user_id: {
      type: "varchar(21)",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.addConstraint(
    "conversation_members",
    "conversation_members_pkey",
    "PRIMARY KEY (conversation_id, user_id)",
  );

  pgm.createIndex("conversation_members", "user_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("conversation_members");
};
