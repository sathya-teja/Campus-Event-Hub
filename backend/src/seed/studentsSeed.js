import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const seedStudents = async () => {
  try {
    await connectDB();

    console.log("🔍 Seeding 10 students...");

    const studentsToSeed = [
      { name: "Alice Smith", email: "alice@gmail.com", password: "Password@123", role: "student" },
      { name: "Bob Johnson", email: "bob@gmail.com", password: "Password@123", role: "student" },
      { name: "Charlie Brown", email: "charlie@gmail.com", password: "Password@123", role: "student" },
      { name: "Diana Prince", email: "diana@gmail.com", password: "Password@123", role: "student" },
      { name: "Ethan Hunt", email: "ethan@gmail.com", password: "Password@123", role: "student" },
      { name: "Fiona Gallagher", email: "fiona@gmail.com", password: "Password@123", role: "student" },
      { name: "George Miller", email: "george@gmail.com", password: "Password@123", role: "student" },
      { name: "Hannah Abbott", email: "hannah@gmail.com", password: "Password@123", role: "student" },
      { name: "Ian Malcolm", email: "ian@gmail.com", password: "Password@123", role: "student" },
      { name: "Julia Roberts", email: "julia@gmail.com", password: "Password@123", role: "student" },
      { name: "Sathya Teja", email: "panyamsathyateja@gmail.com", password: "Password@123", role: "student" }
    ];

    let addedCount = 0;

    for (const studentData of studentsToSeed) {
      // Fail-safe: Check if user already exists by email
      const existing = await User.findOne({ email: studentData.email });
      if (existing) {
        existing.password = studentData.password;
        await existing.save();
        console.log(`✅ Student already exists in DB, updated password: ${studentData.email}`);
      } else {
        await User.create(studentData);
        console.log(`🚀 Created Student: ${studentData.email}`);
        addedCount++;
      }
    }

    console.log(`\n🎉 Student seeding complete! Added ${addedCount} new students.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding students:", error.message);
    process.exit(1);
  }
};

seedStudents();
