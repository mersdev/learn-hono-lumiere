-- Seed the fixed admin login after the catalog and Better Auth tables exist.
-- The password column contains a Better Auth scrypt hash of the configured admin password.
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt, phone, address)
VALUES (
  'lumiere-admin', 'Lumière Admin', 'lumiere.csproject@gmail.com', 1,
  unixepoch() * 1000, unixepoch() * 1000, '', ''
);

UPDATE "user" SET emailVerified = 1 WHERE email = 'lumiere.csproject@gmail.com';

INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
SELECT
  'lumiere-admin-credential', id, 'credential', id,
  '5cc060c7272c307d4bb4f56dceb1fdba:a0d95bc10d55115fce95f475a52ef9702e539144a863d19d22255af2ab3e9c3cab8a1c745617e9c2be1978bb42b1bb14a1879be8506d84aa02e82e8535fbc81c',
  unixepoch() * 1000, unixepoch() * 1000
FROM "user"
WHERE email = 'lumiere.csproject@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM account WHERE userId = "user".id AND providerId = 'credential'
  );

UPDATE account SET password =
  '5cc060c7272c307d4bb4f56dceb1fdba:a0d95bc10d55115fce95f475a52ef9702e539144a863d19d22255af2ab3e9c3cab8a1c745617e9c2be1978bb42b1bb14a1879be8506d84aa02e82e8535fbc81c',
  updatedAt = unixepoch() * 1000
WHERE providerId = 'credential'
  AND userId = (SELECT id FROM "user" WHERE email = 'lumiere.csproject@gmail.com');

DELETE FROM session
WHERE userId = (SELECT id FROM "user" WHERE email = 'lumiere.csproject@gmail.com');
