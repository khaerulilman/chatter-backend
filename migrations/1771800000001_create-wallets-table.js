export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("wallets", {
    id: {
      type: "varchar(21)",
      primaryKey: true,
      notNull: true,
    },
    user_id: {
      type: "varchar(21)",
      notNull: true,
      unique: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    balance: {
      type: "bigint",
      notNull: true,
      default: 0,
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("wallets", "user_id");
};

export const down = (pgm) => {
  pgm.dropTable("wallets");
};
