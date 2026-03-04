import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Image paths (sitting next to this script in /seed/) ─────────────────────
const img = (filename) => {
  const absPath = path.join(__dirname, filename);
  if (!fs.existsSync(absPath)) {
    console.warn(`⚠️  Image not found, skipping: ${filename}`);
    return null;
  }
  // Store as a relative path from project root so Express can serve it
  return `uploads/${filename}`;
};

// ─── Copy seed images into the uploads folder Express serves ─────────────────
const copyImagesToUploads = () => {
  // Resolve the uploads/ folder at project root  (2 levels up from src/seed)
  const uploadsDir = path.resolve(__dirname, "../../uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("📁 Created uploads/ directory");
  }

  const imageFiles = [
    "tech1.jpg", "tech2.jpg", "tech3.jpg", "tech4.jpg",
    "cultural1.jpg", "cultural2.jpg", "cultural3.jpg", "cultural4.jpg",
    "sports1.jpg", "sports2.jpg", "sports3.jpg", "sports4.jpg",
    "workshop1.jpg", "workshop2.jpg", "workshop3.jpg",
  ];

  imageFiles.forEach((file) => {
    const src  = path.join(__dirname, file);
    const dest = path.join(uploadsDir, file);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✅ Copied ${file} → uploads/`);
    }
  });
};

// ─── Date/time helpers ────────────────────────────────────────────────────────
const getEvents = (adminId) => {
  const now = new Date();

  // Build a Date offset by days from now, with a specific hour:minute
  const d = (daysOffset, hour, minute = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  return [
    // ── TECH (Upcoming ×2, Ongoing ×1, Past ×1) ───────────────────────────────
    {
      title:       "Inter-College Hackathon 2026",
      category:    "Tech",
      startDate:   d(8,  9,  0),   // 8 days from now  09:00
      endDate:     d(10, 18, 0),   // 10 days from now 18:00
      location:    "Main Auditorium, Block A",
      description: "A 48-hour coding marathon where teams of 2–4 students compete to build innovative solutions. Prizes worth ₹1,00,000 to be won. Open to all engineering branches.",
      image:       img("tech1.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "AI & Machine Learning Summit",
      category:    "Tech",
      startDate:   d(22, 10, 30),  // 22 days from now 10:30
      endDate:     d(22, 17, 0),   // same day         17:00
      location:    "Seminar Hall, IT Block",
      description: "Industry experts and researchers come together to discuss the latest breakthroughs in AI, deep learning, and generative models. Includes live demos and Q&A.",
      image:       img("tech2.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Code Sprint — DSA Challenge",
      category:    "Tech",
      startDate:   d(-1, 8,  0),   // started yesterday 08:00
      endDate:     d(1,  20, 0),   // ends tomorrow    20:00  → Ongoing
      location:    "Computer Lab 3, Block C",
      description: "A timed Data Structures & Algorithms contest on competitive programming platforms. Individual participation. Certificates for all finishers, cash prizes for top 3.",
      image:       img("tech3.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Open Source Contribution Drive",
      category:    "Tech",
      startDate:   d(-9, 9,  0),   // 9 days ago  09:00
      endDate:     d(-7, 17, 30),  // 7 days ago  17:30  → Past
      location:    "Innovation Lab, Ground Floor",
      description: "Students collaborated on real-world open source projects hosted on GitHub. Mentors from leading tech companies guided participants through pull requests and code reviews.",
      image:       img("tech4.jpg"),
      createdBy:   adminId,
    },

    // ── CULTURAL (Upcoming ×2, Ongoing ×1, Past ×1) ───────────────────────────
    {
      title:       "Harmony Fest 2026",
      category:    "Cultural",
      startDate:   d(14, 11, 0),   // 14 days from now 11:00
      endDate:     d(16, 22, 0),   // 16 days from now 22:00
      location:    "Open Air Amphitheatre",
      description: "The biggest cultural extravaganza of the year! Dance, music, drama, and art competitions across 3 days. Inter-college participation welcome. Grand finale with celebrity performance.",
      image:       img("cultural1.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Battle of Bands",
      category:    "Cultural",
      startDate:   d(32, 16, 0),   // 32 days from now 16:00
      endDate:     d(32, 22, 30),  // same day         22:30
      location:    "College Grounds, Main Stage",
      description: "Rock, pop, fusion — all genres welcome. College bands go head-to-head in front of a live audience and a panel of professional judges. Register your 4–6 member band now.",
      image:       img("cultural2.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Nukkad Natak — Street Play Fest",
      category:    "Cultural",
      startDate:   d(-2, 10, 0),   // started 2 days ago 10:00
      endDate:     d(1,  19, 0),   // ends tomorrow      19:00  → Ongoing
      location:    "College Courtyard & Campus Streets",
      description: "Teams of 8–12 perform hard-hitting social awareness street plays across different campus locations. Theme: 'Change Begins Here'. Judged on script, delivery, and audience impact.",
      image:       img("cultural3.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Classical Dance Competition",
      category:    "Cultural",
      startDate:   d(-13, 9, 30),  // 13 days ago 09:30
      endDate:     d(-12, 18, 0),  // 12 days ago 18:00  → Past
      location:    "Performing Arts Centre",
      description: "A showcase of Bharatanatyam, Kathak, Odissi, and Kuchipudi. Solo and group categories. Judged by nationally recognised Gurus. Recordings will be featured on the college YouTube channel.",
      image:       img("cultural4.jpg"),
      createdBy:   adminId,
    },

    // ── SPORTS (Upcoming ×2, Ongoing ×1, Past ×1) ─────────────────────────────
    {
      title:       "Basketball Championship 2026",
      category:    "Sports",
      startDate:   d(5,  8, 30),   // 5 days from now  08:30
      endDate:     d(7,  18, 0),   // 7 days from now  18:00
      location:    "Indoor Sports Complex, Court 1",
      description: "Inter-college basketball tournament with 16 teams competing in knockout format. Men's and Women's divisions. Live scoring and streaming available on the college sports portal.",
      image:       img("sports1.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Annual Athletics Meet",
      category:    "Sports",
      startDate:   d(27, 7,  0),   // 27 days from now 07:00
      endDate:     d(29, 17, 0),   // 29 days from now 17:00
      location:    "College Stadium & Running Track",
      description: "Track and field events including 100m, 400m, relay, long jump, shot put, and javelin throw. Open to all currently enrolled students. Medals and trophies for top 3 in each event.",
      image:       img("sports2.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Football Super League",
      category:    "Sports",
      startDate:   d(-3, 15, 0),   // started 3 days ago 15:00
      endDate:     d(5,  18, 0),   // ends 5 days from now 18:00  → Ongoing
      location:    "Football Ground, East Campus",
      description: "7-a-side football league running across 2 weeks. 12 college teams registered. Round-robin group stage followed by semis and final. Live commentary and refreshments at the venue.",
      image:       img("sports3.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Yoga & Wellness Day",
      category:    "Sports",
      startDate:   d(-5, 6,  0),   // 5 days ago 06:00
      endDate:     d(-5, 18, 0),   // 5 days ago 18:00  → Past
      location:    "Garden Lawn, Block D",
      description: "A full-day event celebrating physical and mental wellness. Morning yoga session led by certified instructors, followed by meditation, nutrition talks, and fun fitness challenges.",
      image:       img("sports4.jpg"),
      createdBy:   adminId,
    },

    // ── WORKSHOP (Upcoming ×2, Past ×1) ───────────────────────────────────────
    {
      title:       "Full-Stack Web Development Bootcamp",
      category:    "Workshop",
      startDate:   d(11, 9,  0),   // 11 days from now 09:00
      endDate:     d(13, 17, 30),  // 13 days from now 17:30
      location:    "Computer Lab 1, Block B",
      description: "Hands-on 3-day bootcamp covering React, Node.js, Express, and MongoDB. Build and deploy a full-stack project by the end. Laptops required. Limited to 40 participants — register early!",
      image:       img("workshop1.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "UI/UX Design Masterclass",
      category:    "Workshop",
      startDate:   d(19, 10, 0),   // 19 days from now 10:00
      endDate:     d(20, 16, 30),  // 20 days from now 16:30
      location:    "Design Studio, Media Block",
      description: "Learn user research, wireframing, prototyping in Figma, and usability testing from industry designers. Portfolio-worthy project included. Certificate of completion provided.",
      image:       img("workshop2.jpg"),
      createdBy:   adminId,
    },
    {
      title:       "Entrepreneurship & Startup Workshop",
      category:    "Workshop",
      startDate:   d(-8, 9,  30),  // 8 days ago 09:30
      endDate:     d(-7, 17, 0),   // 7 days ago 17:00  → Past
      location:    "Incubation Centre, Admin Block",
      description: "Startup founders and VCs shared insights on ideation, MVP building, pitching, and funding. Participants presented their startup ideas and received live feedback from a panel of investors.",
      image:       img("workshop3.jpg"),
      createdBy:   adminId,
    },
  ];
};

// ─── Main seeder ─────────────────────────────────────────────────────────────
const seedEvents = async () => {
  try {
    await connectDB();
    console.log("\n🌱 Starting Event Seed...\n");

    // Copy images to uploads/ so Express can serve them
    copyImagesToUploads();

    // Find a college_admin to assign as createdBy
    const admin = await User.findOne({ role: "college_admin", status: "approved" });

    if (!admin) {
      console.error(
        "❌ No approved college_admin found.\n" +
        "   Please register and approve a college admin first, then re-run this seed."
      );
      process.exit(1);
    }

    console.log(`👤 Using admin: ${admin.name} (${admin.email})\n`);

    // Optional: wipe existing seeded events
    const existingCount = await Event.countDocuments({ createdBy: admin._id });
    if (existingCount > 0) {
      console.log(`🗑️  Removing ${existingCount} existing event(s) for this admin...`);
      await Event.deleteMany({ createdBy: admin._id });
    }

    const events = getEvents(admin._id);
    const created = await Event.insertMany(events);

    console.log(`\n✅ Successfully seeded ${created.length} events:\n`);
    created.forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.category.padEnd(8)}] ${e.title}`);
    });

    console.log("\n🎉 Seed complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedEvents();