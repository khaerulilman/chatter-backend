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
  pgm.addColumn("posts", {
    is_follower_only: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    hidden_content: {
      type: "text",
      notNull: false,
      default: null,
    },
    hidden_media_urls: {
      type: "jsonb",
      notNull: false,
      default: null,
    },
    hidden_media_fileids: {
      type: "jsonb",
      notNull: false,
      default: null,
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn("posts", "hidden_media_fileids");
  pgm.dropColumn("posts", "hidden_media_urls");
  pgm.dropColumn("posts", "hidden_content");
  pgm.dropColumn("posts", "is_follower_only");
};
