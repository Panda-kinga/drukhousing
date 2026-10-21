-- Run after schema.sql and migrations.
-- This uses the first existing landlord account and adds two sample homes.
INSERT INTO listings
  (landlord_id,title,location,dzongkhag,gewog,price,type,lease_years,deadline)
SELECT id,'Family home near the school','Near the school','Samtse','Tashicholing',20000,'house',1,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '30 days'
FROM users
WHERE role='landlord'
ORDER BY id
LIMIT 1;

INSERT INTO listings
  (landlord_id,title,location,dzongkhag,gewog,price,type,lease_years,deadline)
SELECT id,'Room near Kanglung town','Kanglung town','Trashigang','Kanglung',8000,'room',1,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '30 days'
FROM users
WHERE role='landlord'
ORDER BY id
LIMIT 1;
