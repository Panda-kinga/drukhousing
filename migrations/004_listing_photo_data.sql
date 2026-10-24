-- Persist landlord-uploaded listing photos in PostgreSQL.
-- Existing file_path values remain for compatibility, but legacy photos with no
-- image_data are not displayed because Render's temporary filesystem may have lost them.
BEGIN;

ALTER TABLE listing_photos
  ADD COLUMN image_data BYTEA,
  ADD COLUMN content_type VARCHAR(50);

ALTER TABLE listing_photos
  ADD CONSTRAINT listing_photos_image_pair
    CHECK ((image_data IS NULL) = (content_type IS NULL)),
  ADD CONSTRAINT listing_photos_content_type
    CHECK (content_type IS NULL OR content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT listing_photos_image_size
    CHECK (image_data IS NULL OR octet_length(image_data) BETWEEN 1 AND 5242880);

COMMIT;
