export const shorthands = undefined;

export const up = (pgm) => {
  // Add paid post columns to posts table
  pgm.addColumns("posts", {
    is_paid: {
      type: "boolean",
      default: false,
      notNull: true,
    },
    price: {
      type: "integer",
      default: null,
    },
  });

  // Create post_purchases table to track who bought which post
  pgm.createTable("post_purchases", {
    id: {
      type: "varchar(21)",
      primaryKey: true,
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
    amount: {
      type: "integer",
      notNull: true,
    },
    created_at: {
      type: "timestamp",
      default: pgm.func("NOW()"),
      notNull: true,
    },
  });

  // Each user can only purchase a post once
  pgm.addConstraint("post_purchases", "unique_user_post_purchase", {
    unique: ["user_id", "post_id"],
  });

  pgm.createIndex("post_purchases", "user_id");
  pgm.createIndex("post_purchases", "post_id");
};

export const down = (pgm) => {
  pgm.dropTable("post_purchases");
  pgm.dropColumns("posts", ["is_paid", "price"]);
};
