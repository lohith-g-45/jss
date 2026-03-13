UPDATE users SET password='$2a$10$YyGdxSof2nx5AqYYbjrxp.sJ3PgNHTCrv/o9A9lcmxwkpyyxch0P2' WHERE id=1;
UPDATE users SET password='$2a$10$kJeBIWQIJpXZMURvmWX5xO.B9HowyewHzQ.zWiXFXcGubHvELtdPq' WHERE id=2;
SELECT id, email, LENGTH(password) as pwd_len, password FROM users;
