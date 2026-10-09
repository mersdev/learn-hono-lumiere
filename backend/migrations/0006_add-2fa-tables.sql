ALTER TABLE user ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0;

CREATE TABLE twoFactor (
    id TEXT PRIMARY KEY,
    secret TEXT NOT NULL,
    backupCodes TEXT NOT NULL,
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id)
);
