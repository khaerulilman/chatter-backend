export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("wallet_transactions", {
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
    type: {
      type: "varchar(20)",
      notNull: true,
      // 'topup' or 'withdraw'
    },
    amount: {
      type: "bigint",
      notNull: true,
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pending",
      // 'pending', 'success', 'failed', 'expired'
    },
    midtrans_order_id: {
      type: "varchar(100)",
      notNull: false,
      unique: true,
    },
    midtrans_transaction_id: {
      type: "varchar(100)",
      notNull: false,
    },
    payment_type: {
      type: "varchar(50)",
      notNull: false,
    },
    snap_token: {
      type: "text",
      notNull: false,
    },
    snap_redirect_url: {
      type: "text",
      notNull: false,
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

  pgm.createIndex("wallet_transactions", "user_id");
  pgm.createIndex("wallet_transactions", "midtrans_order_id");
  pgm.createIndex("wallet_transactions", "status");
};

export const down = (pgm) => {
  pgm.dropTable("wallet_transactions");
};
