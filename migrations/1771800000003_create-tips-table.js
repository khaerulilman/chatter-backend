export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("tips", {
    id: {
      type: "varchar(21)",
      primaryKey: true,
      notNull: true,
    },
    sender_id: {
      type: "varchar(21)",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    receiver_id: {
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
    amount: {
      type: "bigint",
      notNull: true,
    },
    message: {
      type: "text",
      notNull: false,
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("tips", "sender_id");
  pgm.createIndex("tips", "receiver_id");
  pgm.createIndex("tips", "post_id");
  pgm.createIndex("tips", "created_at");
};

export const down = (pgm) => {
  pgm.dropTable("tips");
};
