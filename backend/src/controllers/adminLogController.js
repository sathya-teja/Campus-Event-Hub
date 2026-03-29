import AdminLog from "../models/AdminLog.js";


export const getLogs = async (req, res) => {
  try {
    let filter = {};

    // College admin → only their logs
    if (req.user.role === "college_admin") {
      filter.adminId = req.user._id;
    }

    const logs = await AdminLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("adminId", "name email profileImage");

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};