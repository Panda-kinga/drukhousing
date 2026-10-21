const db = require("../config/db");

async function getStats() {
  const [users, signups, properties, propertyTypes, locations, inquiries, inquiryProperties, recentUsers] =
    await Promise.all([
      db.one(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE role='tenant')::int AS tenants,
        COUNT(*) FILTER (WHERE role='landlord')::int AS landlords,
        COUNT(*) FILTER (WHERE role='superadmin')::int AS superadmins,
        COUNT(*) FILTER (WHERE is_verified)::int AS verified,
        COUNT(*) FILTER (WHERE NOT is_verified)::int AS unverified FROM users`),
      db.one(`SELECT
        COUNT(*) FILTER (WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '7 days' AND role='tenant')::int AS tenants_7,
        COUNT(*) FILTER (WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '7 days' AND role='landlord')::int AS landlords_7,
        COUNT(*) FILTER (WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '30 days' AND role='tenant')::int AS tenants_30,
        COUNT(*) FILTER (WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '30 days' AND role='landlord')::int AS landlords_30 FROM users`),
      db.one(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active)::int AS active,
        COUNT(*) FILTER (WHERE NOT is_active)::int AS removed FROM listings`),
      db.any("SELECT type, COUNT(*)::int AS count FROM listings GROUP BY type ORDER BY type"),
      db.any("SELECT location, COUNT(*)::int AS count FROM listings GROUP BY location ORDER BY count DESC, location LIMIT 5"),
      db.one(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='pending')::int AS pending,
        COUNT(*) FILTER (WHERE status='accepted')::int AS accepted,
        COUNT(*) FILTER (WHERE status='rejected')::int AS rejected FROM applications`),
      db.any(`SELECT l.id, l.title, COUNT(a.id)::int AS inquiry_count
        FROM listings l LEFT JOIN applications a ON a.listing_id=l.id
        GROUP BY l.id, l.title ORDER BY inquiry_count DESC, l.id LIMIT 5`),
      db.any("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 10"),
    ]);
  return { users, signups, properties, propertyTypes, locations, inquiries, inquiryProperties, recentUsers };
}
function logAction(adminId, action, targetType, targetId) {
  return db.none(
    "INSERT INTO admin_actions(admin_id,action,target_type,target_id) VALUES($1,$2,$3,$4)",
    [adminId, action, targetType, targetId],
  );
}
function recentActions() {
  return db.any(`SELECT a.*,u.name AS admin_name FROM admin_actions a
    JOIN users u ON u.id=a.admin_id ORDER BY a.created_at DESC LIMIT 20`);
}

module.exports = { getStats, logAction, recentActions };
