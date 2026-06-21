import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

/*
========================================
🎓 STUDENTS SEED
----------------------------------------
30 students total:
  - 29 generated with realistic Indian names/emails (firstname.lastnameNN@gmail.com)
  - 1 required demo account: Panyam Sathya Teja (panyamsathyateja@gmail.com)

Colleges are distributed round-robin across the 4 approved admin colleges
so that registrations/feedback/discussions across those colleges' events
look organic in interactionsSeed.js.

Every student record satisfies the User schema's implicit "complete profile"
expectation: name, email, phone, college, role, approved status.
profileImage is left empty ("") — the frontend already renders initials
as a fallback avatar everywhere (Navbar, Sidebar tables, Discussion, etc).
========================================
*/

const COLLEGES = [
  "NBKR Institute of Science & Technology",
  "Vellore Institute of Technology",
  "JNTU Hyderabad",
  "SVU College of Engineering",
];

// 29 realistic students — name, email already hand-verified unique & convention-matching
const generatedStudents = [
  { name: "Arjun Reddy",          email: "arjun.reddy01@gmail.com" },
  { name: "Priya Sharma",         email: "priya.sharma02@gmail.com" },
  { name: "Rahul Verma",          email: "rahul.verma03@gmail.com" },
  { name: "Sneha Iyer",           email: "sneha.iyer04@gmail.com" },
  { name: "Vikram Patel",         email: "vikram.patel05@gmail.com" },
  { name: "Ananya Nair",          email: "ananya.nair06@gmail.com" },
  { name: "Karthik Subramanian",  email: "karthik.subramanian07@gmail.com" },
  { name: "Divya Menon",          email: "divya.menon08@gmail.com" },
  { name: "Rohan Gupta",          email: "rohan.gupta09@gmail.com" },
  { name: "Meera Pillai",         email: "meera.pillai10@gmail.com" },
  { name: "Aditya Rao",           email: "aditya.rao11@gmail.com" },
  { name: "Kavya Krishnan",       email: "kavya.krishnan12@gmail.com" },
  { name: "Siddharth Joshi",      email: "siddharth.joshi13@gmail.com" },
  { name: "Pooja Desai",          email: "pooja.desai14@gmail.com" },
  { name: "Nikhil Kumar",         email: "nikhil.kumar15@gmail.com" },
  { name: "Shreya Agarwal",       email: "shreya.agarwal16@gmail.com" },
  { name: "Varun Chowdary",       email: "varun.chowdary17@gmail.com" },
  { name: "Ishita Bansal",        email: "ishita.bansal18@gmail.com" },
  { name: "Sai Kiran",            email: "sai.kiran19@gmail.com" },
  { name: "Lakshmi Narayanan",    email: "lakshmi.narayanan20@gmail.com" },
  { name: "Harsha Vardhan",       email: "harsha.vardhan21@gmail.com" },
  { name: "Ritika Malhotra",      email: "ritika.malhotra22@gmail.com" },
  { name: "Aravind Murthy",       email: "aravind.murthy23@gmail.com" },
  { name: "Tanvi Kapoor",         email: "tanvi.kapoor24@gmail.com" },
  { name: "Manoj Reddy",          email: "manoj.reddy25@gmail.com" },
  { name: "Sowmya Rajan",         email: "sowmya.rajan26@gmail.com" },
  { name: "Akash Mehta",          email: "akash.mehta27@gmail.com" },
  { name: "Nandini Bhat",         email: "nandini.bhat28@gmail.com" },
  { name: "Vivek Choudhary",      email: "vivek.choudhary29@gmail.com" },
];

const studentsToSeed = generatedStudents.map((s, i) => ({
  name: s.name,
  email: s.email,
  password: "Password@123",
  role: "student",
  college: COLLEGES[i % COLLEGES.length],
  phone: `+91 90${String(1000000 + i * 37).slice(0, 8)}`,
  status: "approved",
}));

// ── Required demo account — hand-placed, exact values per spec ───────────
studentsToSeed.push({
  name: "Panyam Sathya Teja",
  email: "panyamsathyateja@gmail.com",
  password: "Password@123",
  role: "student",
  college: "NBKR Institute of Science & Technology",
  phone: "+91 9000000030",
  status: "approved",
});

const seedStudents = async () => {
  try {
    await connectDB();

    console.log(`🔍 Seeding ${studentsToSeed.length} students...\n`);

    let addedCount = 0;
    let updatedCount = 0;

    for (const studentData of studentsToSeed) {
      const existing = await User.findOne({ email: studentData.email });

      if (existing) {
        existing.name = studentData.name;
        existing.password = studentData.password;
        existing.college = studentData.college;
        existing.phone = studentData.phone;
        existing.status = studentData.status;
        await existing.save();
        console.log(`✅ Student already exists, updated: ${studentData.email}`);
        updatedCount++;
      } else {
        await User.create(studentData);
        console.log(`🚀 Created Student: ${studentData.email} (${studentData.college})`);
        addedCount++;
      }
    }

    console.log(`\n🎉 Student seeding complete!`);
    console.log(`   ${addedCount} created · ${updatedCount} updated · ${studentsToSeed.length} total\n`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding students:", error.message);
    process.exit(1);
  }
};

seedStudents();
