import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Discussion from "../models/Discussion.js";
import Feedback from "../models/Feedback.js";

dotenv.config();

const seedInteractions = async () => {
  try {
    await connectDB();

    console.log("=========================================");
    console.log("🔍 STARTING INTERACTIONS SEEDING");
    console.log("=========================================\n");

    // 1. Fetch Students
    const studentEmails = [
      "alice@gmail.com",
      "bob@gmail.com",
      "charlie@gmail.com",
      "diana@gmail.com",
      "ethan@gmail.com",
      "panyamsathyateja@gmail.com",
    ];
    const students = await User.find({ email: { $in: studentEmails } });
    if (students.length === 0) {
      throw new Error("❌ No students found. Please run 'node studentsSeed.js' first.");
    }
    console.log(`✅ Loaded ${students.length} students.`);

    // 2. Fetch Admins
    const adminEmails = ["john@gmail.com", "emily@gmail.com"];
    const admins = await User.find({ email: { $in: adminEmails } });
    if (admins.length === 0) {
      throw new Error("❌ No admins found. Please run 'node collegeAdminsSeed.js' first.");
    }
    console.log(`✅ Loaded ${admins.length} college admins.\n`);

    // 3. Fetch Events
    const events = await Event.find().limit(2);
    if (events.length === 0) {
      throw new Error("❌ No events found. Please run event seeds first.");
    }

    // 4. Clear existing interactions
    await Registration.deleteMany({});
    await Discussion.deleteMany({});
    await Feedback.deleteMany({});
    console.log("🧹 Cleared old registrations, discussions, and feedback...\n");

    for (const event of events) {
      console.log(`\n📅---------------------------------------------------------`);
      console.log(`📅 EVENT SEEDING: "${event.title}"`);
      console.log(`📅---------------------------------------------------------`);
      
      let admin = await User.findById(event.createdBy);
      if (!admin) {
        admin = admins[Math.floor(Math.random() * admins.length)];
      }
      console.log(`🛠️ Designated Admin (Event Creator): ${admin.name} (${admin.email})\n`);

      // --- SEED REGISTRATIONS & FEEDBACK ---
      for (const student of students) {
        
        // A. Registration
        await Registration.create({
          userId: student._id,
          eventId: event._id,
          status: "approved",
          approvedBy: admin._id,
          attended: true,
          attendedAt: new Date(Date.now() - 86400000), 
        });
        console.log(`   ➔ [REGISTERED & APPROVED] Student: ${student.name} | Event: "${event.title}"`);

        // B. Feedback
        const ratings = [4, 5, 5, 4, 3];
        const comments = [
          "Absolutely amazing event, learned a lot!",
          "Great speakers and very well organized.",
          "Good experience, but could have been slightly longer.",
          "Really enjoyed the interactive sessions.",
          "Decent event, looking forward to the next one."
        ];
        const rating = ratings[Math.floor(Math.random() * ratings.length)];
        const comment = comments[Math.floor(Math.random() * comments.length)];
        
        await Feedback.create({
          userId: student._id,
          eventId: event._id,
          rating: rating,
          comment: comment,
        });
        console.log(`   ➔ [FEEDBACK ADDED] Student: ${student.name} dropped a ${rating}-star rating!\n`);
      }

      // --- SEED DISCUSSIONS ---
      console.log(`\n💬 SEEDING DISCUSSIONS FOR: "${event.title}"`);
      // Student 1 asks
      const student1 = students[0]; // Alice
      const discussion1 = await Discussion.create({
        eventId: event._id,
        userId: student1._id,
        message: "Will we receive digital certificates immediately after the event ends?",
      });
      console.log(`   ➔ [Q&A ASKED] ${student1.name}: "Will we receive digital certificates immediately after the event ends?"`);
      
      // Admin replies
      discussion1.replies.push({
        userId: admin._id,
        message: "Yes! Pdf certificates will automatically appear in your 'My Certificates' tab once we scan your check-in QR code.",
      });
      await discussion1.save();
      console.log(`   ➔ [Q&A REPLY] ${admin.name}: "Yes! Pdf certificates will automatically appear..."\n`);

      // Student 2 asks
      const student2 = students[1]; // Bob
      const discussion2 = await Discussion.create({
        eventId: event._id,
        userId: student2._id,
        message: "Are there any prerequisites or things we need to prepare beforehand?",
      });
      console.log(`   ➔ [Q&A ASKED] ${student2.name}: "Are there any prerequisites or things we need to prepare beforehand?"`);
      
      // Admin replies
      discussion2.replies.push({
        userId: admin._id,
        message: "No specific prerequisites. Just make sure you bring your college ID and have the QR ticket ready on your phone!",
      });
      await discussion2.save();
      console.log(`   ➔ [Q&A REPLY] ${admin.name}: "No specific prerequisites. Just make sure..."\n`);

      console.log(`✅ Completed seeding for event: ${event.title}\n`);
    }

    console.log("===============================================================");
    console.log("🎉 ALL INTERACTIONS (Registrations, Feedback, Discussions) SEEDED SUCCESSFULLY!");
    console.log("===============================================================\n");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error seeding interactions:", error);
    process.exit(1);
  }
};

seedInteractions();
