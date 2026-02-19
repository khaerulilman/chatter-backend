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
  pgm.addColumns("users", {
    otp: {
      type: "integer",
      notNull: false,
    },
    otp_expires: {
      type: "timestamp",
      notNull: false,
    },
    reset_otp: {
      type: "integer",
      notNull: false,
    },
    reset_otp_expires: {
      type: "timestamp",
      notNull: false,
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns("users", [
    "otp",
    "otp_expires",
    "reset_otp",
    "reset_otp_expires",
  ]);
};
