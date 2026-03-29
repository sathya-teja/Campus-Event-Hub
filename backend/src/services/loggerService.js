import AdminLog from "../models/AdminLog.js";


export const logAdminAction = (
  adminUser,
  action,
  targetId,
  targetType,
  details = {}
) => {
  // 🔥 fire-and-forget (no await)
  AdminLog.create({
    adminId: adminUser._id,
    adminRole: adminUser.role,
    action,
    targetEntityId: targetId,
    targetEntityType: targetType,
    details,
  }).catch((err) => {
    console.error("Admin log failed:", err.message);
  });
};