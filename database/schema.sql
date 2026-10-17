-- First create a database named drukhousing in pgAdmin, then open its Query Tool.
-- Run once in an EMPTY database. All local timestamps represent Bhutan time.
BEGIN;
SET TIME ZONE 'Asia/Thimphu';
CREATE TABLE users (
 id SERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
 email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(email) AND position('@' in email) > 1),
 password_hash TEXT NOT NULL,
 role VARCHAR(20) NOT NULL CHECK (role IN ('tenant','landlord','superadmin')),
 is_verified BOOLEAN NOT NULL DEFAULT false,
 verification_token TEXT UNIQUE,
 reset_token TEXT UNIQUE,
 reset_token_expires TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu'),
 CHECK ((reset_token IS NULL) = (reset_token_expires IS NULL))
);
CREATE TABLE listings (
 id SERIAL PRIMARY KEY,
 landlord_id INTEGER NOT NULL REFERENCES users(id),
 title VARCHAR(150) NOT NULL CHECK (length(trim(title)) > 0),
 location VARCHAR(150) NOT NULL CHECK (length(trim(location)) > 0),
 price NUMERIC(12,2) NOT NULL CHECK (price > 0 AND price < 10000000000),
 type VARCHAR(20) NOT NULL CHECK (type IN ('apartment','house','room')),
 lease_years INTEGER NOT NULL CHECK (lease_years > 0),
 deadline TIMESTAMP NOT NULL CHECK (isfinite(deadline)),
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu'),
 CHECK (deadline > created_at)
);
CREATE TABLE listing_photos (
 id SERIAL PRIMARY KEY,
 listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
 file_path TEXT NOT NULL CHECK (length(trim(file_path)) > 0)
);
CREATE TABLE applications (
 id SERIAL PRIMARY KEY,
 listing_id INTEGER NOT NULL REFERENCES listings(id),
 tenant_id INTEGER NOT NULL REFERENCES users(id),
 full_name VARCHAR(100) NOT NULL CHECK (length(trim(full_name)) > 0),
 phone VARCHAR(30) NOT NULL CHECK (length(trim(phone)) > 0),
 notes VARCHAR(2000) NOT NULL DEFAULT '',
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
 created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu'),
 UNIQUE (listing_id, tenant_id)
);
CREATE TABLE application_documents (
 id SERIAL PRIMARY KEY,
 application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
 file_path TEXT NOT NULL CHECK (length(trim(file_path)) > 0)
);
CREATE INDEX listings_owner ON listings(landlord_id);
CREATE INDEX listings_deadline ON listings(deadline) WHERE is_active;
CREATE INDEX applications_tenant ON applications(tenant_id);
CREATE INDEX photos_listing ON listing_photos(listing_id);
CREATE INDEX documents_application ON application_documents(application_id);
-- Foreign keys enforce existence. These triggers also enforce the person's role.
CREATE FUNCTION check_listing_landlord() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.landlord_id AND role='landlord') THEN
  RAISE EXCEPTION 'A listing must belong to a landlord';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER listing_landlord_role BEFORE INSERT OR UPDATE OF landlord_id ON listings
 FOR EACH ROW EXECUTE FUNCTION check_listing_landlord();
CREATE FUNCTION check_application_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.tenant_id AND role='tenant') THEN
  RAISE EXCEPTION 'An application must belong to a tenant';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER application_tenant_role BEFORE INSERT OR UPDATE OF tenant_id ON applications
 FOR EACH ROW EXECUTE FUNCTION check_application_tenant();
COMMIT;
-- Check signup roles:
-- SELECT id, name, email, role FROM users;
-- Promote a verified existing account (replace email):
-- UPDATE users SET role='superadmin' WHERE email='youraddress@gmail.com' AND is_verified=true;
