/**
 * Numbered schema migrations. `PRAGMA user_version` tracks the applied version.
 * Never edit a shipped migration: add a new one.
 *
 * Money is stored in minor units (pence/cents) as INTEGER. Dates are ISO
 * `YYYY-MM-DD` strings in local time; timestamps are ISO 8601 UTC strings.
 */

export type Migration = { version: number; sql: string };

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        color       TEXT NOT NULL,
        icon        TEXT NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS items (
        id             TEXT PRIMARY KEY NOT NULL,
        kind           TEXT NOT NULL,
        name           TEXT NOT NULL,
        amount         INTEGER NOT NULL,
        currency       TEXT NOT NULL,
        cycle          TEXT NOT NULL,
        cycle_every    INTEGER NOT NULL DEFAULT 1,
        cycle_unit     TEXT NOT NULL DEFAULT 'month',
        anchor_date    TEXT NOT NULL,
        next_due_date  TEXT NOT NULL,
        end_date       TEXT,
        category_id    TEXT REFERENCES categories(id),
        payment_method TEXT,
        autopay        INTEGER NOT NULL DEFAULT 1,
        reminder_days  INTEGER,
        notes          TEXT,
        url            TEXT,
        icon           TEXT,
        color          TEXT,
        is_archived    INTEGER NOT NULL DEFAULT 0,
        archived_at    TEXT,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_items_active ON items (is_archived, next_due_date);

      CREATE TABLE IF NOT EXISTS loan_details (
        item_id            TEXT PRIMARY KEY NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        principal_total    INTEGER NOT NULL,
        remaining_balance  INTEGER NOT NULL,
        installments_total INTEGER,
        installments_paid  INTEGER NOT NULL DEFAULT 0,
        interest_rate_bp   INTEGER,
        lender             TEXT
      );

      CREATE TABLE IF NOT EXISTS savings_details (
        item_id       TEXT PRIMARY KEY NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        target_amount INTEGER NOT NULL,
        saved_amount  INTEGER NOT NULL DEFAULT 0,
        target_date   TEXT
      );

      CREATE TABLE IF NOT EXISTS payments (
        id         TEXT PRIMARY KEY NOT NULL,
        item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        period     TEXT NOT NULL,
        due_date   TEXT NOT NULL,
        amount     INTEGER NOT NULL,
        currency   TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'due',
        paid_at    TEXT,
        note       TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (item_id, period)
      );
      CREATE INDEX IF NOT EXISTS idx_payments_period ON payments (period, due_date);

      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('main_currency', 'GBP'),
        ('eur_to_gbp_rate', '0.85'),
        ('monthly_income', ''),
        ('default_reminder_days', '2'),
        ('reminder_hour', '9'),
        ('theme_pref', 'system'),
        ('week_starts_monday', '1');

      INSERT OR IGNORE INTO categories (id, name, color, icon, sort_order) VALUES
        ('cat_streaming',  'Streaming',        '#7C5CE6', 'play-circle-outline', 10),
        ('cat_software',   'Software & apps',  '#5B7BD5', 'code-slash-outline',  20),
        ('cat_phone',      'Phone & internet', '#1FA3B8', 'wifi-outline',        30),
        ('cat_home',       'Home',             '#3B82C4', 'home-outline',        40),
        ('cat_utilities',  'Utilities',        '#2F9E8F', 'flash-outline',       50),
        ('cat_insurance',  'Insurance',        '#6B7A8F', 'shield-outline',      60),
        ('cat_transport',  'Transport',        '#C27C2C', 'car-outline',         70),
        ('cat_health',     'Health & fitness', '#D1565A', 'fitness-outline',     80),
        ('cat_loans',      'Loans',            '#E07A2F', 'cash-outline',        90),
        ('cat_savings',    'Savings',          '#2EAA8C', 'leaf-outline',        100),
        ('cat_other',      'Other',            '#8A939B', 'ellipsis-horizontal-circle-outline', 110);
    `,
  },
];

export const SCHEMA_VERSION = migrations[migrations.length - 1]!.version;
