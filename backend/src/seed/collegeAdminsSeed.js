import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const seedCollegeAdmins = async () => {
  try {
    await connectDB();

    console.log("🔍 Seeding 2 college admins...");

    const adminsToSeed = [
  {
    name: "John Anderson",
    email: "john@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "NBKR Institute of Science & Technology",
    status: "approved",
  },
  {
    name: "Emily Johnson",
    email: "emily@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "Vellore Institute of Technology",
    status: "approved",
  }
];

    for (const adminData of adminsToSeed) {
      const existing = await User.findOne({ email: adminData.email });
      if (existing) {
        existing.password = adminData.password;
        await existing.save();
        console.log(`✅ Admin already exists, updated password: ${adminData.email}`);
      } else {
        await User.create(adminData);
        console.log(`🚀 Created Admin: ${adminData.email}`);
      }
    }

    console.log("🎉 College admins seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding college admins:", error.message);
    process.exit(1);
  }
};

seedCollegeAdmins();
