
BEGIN;

ALTER TABLE listing_photos
  ADD COLUMN IF NOT EXISTS image_data BYTEA,
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_photos_image_pair'
      AND conrelid = 'listing_photos'::regclass
  ) THEN
    ALTER TABLE listing_photos
      ADD CONSTRAINT listing_photos_image_pair
      CHECK (
        (image_data IS NULL) = (content_type IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_photos_content_type'
      AND conrelid = 'listing_photos'::regclass
  ) THEN
    ALTER TABLE listing_photos
      ADD CONSTRAINT listing_photos_content_type
      CHECK (
        content_type IS NULL
        OR content_type IN (
          'image/jpeg',
          'image/png',
          'image/webp'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_photos_image_size'
      AND conrelid = 'listing_photos'::regclass
  ) THEN
    ALTER TABLE listing_photos
      ADD CONSTRAINT listing_photos_image_size
      CHECK (
        image_data IS NULL
        OR octet_length(image_data) BETWEEN 1 AND 5242880
      );
  END IF;
END $$;

COMMIT;
