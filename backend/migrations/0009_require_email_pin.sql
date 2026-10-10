-- Every account must complete the email PIN challenge after password sign-in.
UPDATE "user" SET twoFactorEnabled = 1;
INSERT INTO twoFactor (id, secret, backupCodes, userId, verified)
SELECT lower(hex(randomblob(16))), '', '', u.id, 1
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM twoFactor t WHERE t.userId = u.id);

-- Better Auth's OTP verifier requires a twoFactor row, even without TOTP.
CREATE TRIGGER user_email_pin AFTER INSERT ON "user"
BEGIN
  INSERT INTO twoFactor (id, secret, backupCodes, userId, verified)
  VALUES (lower(hex(randomblob(16))), '', '', NEW.id, 1);
END;
