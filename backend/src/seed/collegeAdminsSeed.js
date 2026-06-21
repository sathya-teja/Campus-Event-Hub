import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

/*
========================================
🏫 COLLEGE ADMINS SEED
----------------------------------------
6 admin records:
  - 4 APPROVED  → own events, used for the main demo dataset
  - 1 PENDING   → for testing the Super Admin "Manage Admins" approval flow
  - 1 REJECTED  → for testing the rejected-admin state

NOTE: User.status defaults to "pending" for role "college_admin"
(see models/User.js), so we explicitly set status on every record
to guarantee the exact state required by the demo, regardless of
schema defaults.
========================================
*/

const adminsToSeed = [
  // ── APPROVED — own events (see seedEvents.js) ─────────────────────────
  {
    name: "Sathya Teja",
    email: "sathyateja116@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "NBKR Institute of Science & Technology",
    phone: "+91 9876543101",
    status: "approved",
  },
  {
    name: "Sathya Teja",
    email: "sathyateja118@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "Vellore Institute of Technology",
    phone: "+91 9876543102",
    status: "approved",
  },
  {
    name: "James Carter",
    email: "james.jntu@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "JNTU Hyderabad",
    phone: "+91 9876543103",
    status: "approved",
  },
  {
    name: "Emily Johnson",
    email: "emily.svu@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "SVU College of Engineering",
    phone: "+91 9876543104",
    status: "approved",
  },

  // ── PENDING — for Super Admin approval-flow demo ──────────────────────
  {
    name: "Alex Mathew",
    email: "alex.andhra@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "Andhra University",
    phone: "+91 9876543105",
    status: "pending",
  },

  // ── REJECTED — for rejected-admin state demo ──────────────────────────
  {
    name: "Sarah Thomas",
    email: "sarah.amrita@gmail.com",
    password: "Password@123",
    role: "college_admin",
    college: "Amrita Vishwa Vidyapeetham",
    phone: "+91 9876543106",
    status: "rejected",
  },
];

const seedCollegeAdmins = async () => {
  try {
    await connectDB();

    console.log("🔍 Seeding college admins (4 approved, 1 pending, 1 rejected)...\n");

    for (const adminData of adminsToSeed) {
      const existing = await User.findOne({ email: adminData.email });

      if (existing) {
        // Update password + ensure status/college/phone match the spec exactly,
        // so re-running this seed always converges to the required demo state.
        existing.password = adminData.password;
        existing.name = adminData.name;
        existing.college = adminData.college;
        existing.phone = adminData.phone;
        existing.status = adminData.status;
        await existing.save();
        console.log(`✅ Admin already exists, updated: ${adminData.email} [${adminData.status}]`);
      } else {
        await User.create(adminData);
        console.log(`🚀 Created Admin: ${adminData.email} [${adminData.status}]`);
      }
    }

    console.log("\n🎉 College admins seeding complete!");
    console.log("   4 approved · 1 pending · 1 rejected\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding college admins:", error.message);
    process.exit(1);
  }
};

seedCollegeAdmins();
