import dotenv from "dotenv";
import path from "path";
import { uploadFileToCloudinary } from "../services/cloudinaryService.js";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
========================================
📅 EVENTS SEED
----------------------------------------
20 events total (15 original + 5 new), exactly 5 per approved admin:

  NBKR (sathyateja116@gmail.com)  → 1 Past, 1 Ongoing, 3 Upcoming
  VIT  (sathyateja118@gmail.com)  → 1 Past, 1 Ongoing, 3 Upcoming
  JNTU (james.jntu@gmail.com)     → 2 Past, 1 Ongoing, 2 Upcoming
  SVU  (emily.svu@gmail.com)      → 2 Past, 1 Ongoing, 2 Upcoming

  Totals: 6 Past · 4 Ongoing · 10 Upcoming = 20 events

----------------------------------------
📌 LONG-TERM DATE STRATEGY (read before editing)
----------------------------------------
This is a portfolio project that may stay deployed for 3–4 years without
being re-seeded. Hardcoding fixed calendar dates would make every event
"Past" within months. Instead, every date below is computed RELATIVE TO
THE MOMENT THIS SCRIPT RUNS, using daysFromNow(offsetDays, hour, minute).

  - Past events    → offsets of -7, -15, -30, -60, -90, -120 days
  - Ongoing events → started 30 days ago, end ~4 years from now
                      (startDate = now-30d, endDate = now+1460d), modelling
                      long-running campus programs (incubation cells,
                      open-source clubs, sports leagues, research groups)
                      that are realistically "always ongoing".
  - Upcoming events → 4 "near future" (+7,+15,+30,+90 days) and
                      6 "long-term future" (+365,+700,+1000,+1400,+1800,+2200
                      days), so the platform keeps showing fresh upcoming
                      events for several years without re-seeding.

This guarantees correct Upcoming/Ongoing/Past classification (see
getEventStatus() in AdminDashboard.jsx / getStatus() in EventDetail.jsx)
at any point during the multi-year deployment window, AS OF the day this
script is executed. If you want the demo to look fresh again in year 5+,
simply re-run this seed (it is idempotent — see "already exists" check).
========================================
*/

const NOW = new Date();

/** Returns a Date offset by `offsetDays` from the moment the seed runs, at the given hour:minute. */
const daysFromNow = (offsetDays, hour = 9, minute = 0) => {
  const date = new Date(NOW);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const EVENT_IMAGE_FOLDER = "campuseventhub/events";

const uploadSeedImage = async (filename) => {
  const imagePath = path.join(__dirname, filename);

  return await uploadFileToCloudinary(
    imagePath,
    EVENT_IMAGE_FOLDER
  );
};

/*
========================================
EVENT DEFINITIONS
Grouped by admin. Each event is tagged with its intended lifecycle
status in a comment — this is what interactionsSeed.js relies on to
decide registrations/attendance/feedback/discussions per event.
========================================
*/
const buildEvents = (adminMap) => {
  const { nbkr, vit, jntu, svu } = adminMap;

  return [
    /* ════════════════════════════════════════════════════════════
       NBKR — 1 Past, 1 Ongoing, 3 Upcoming
    ════════════════════════════════════════════════════════════ */
    {
      // PAST (-7 days)
      title:       "Inter-College Hackathon 2026",
      category:    "Tech",
      startDate:   daysFromNow(-9, 9, 0),
      endDate:     daysFromNow(-7, 18, 0),
      location:    "Main Auditorium, Block A",
      description: "A 48-hour coding marathon where teams of 2–4 students competed to build innovative solutions. Prizes worth ₹1,00,000 were awarded. Open to all engineering branches.",
      image:       "tech1.jpg",
      maxParticipants: 120,
      createdBy:   nbkr._id,
    },
    {
      // ONGOING — street play fest running across campus over several days
      title:       "Nukkad Natak — Street Play Fest",
      category:    "Cultural",
      startDate:   daysFromNow(-30, 10, 0),
      endDate:     daysFromNow(1460, 19, 0),
      location:    "College Courtyard & Campus Streets",
      description: "Teams of 8–12 perform hard-hitting social awareness street plays across different campus locations. Theme: 'Change Begins Here'. Judged on script, delivery, and audience impact.",
      image:       "cultural3.jpg",
      maxParticipants: 150,
      createdBy:   nbkr._id,
    },
    {
      // UPCOMING — near future (+7)
      title:       "AI & Machine Learning Summit",
      category:    "Tech",
      startDate:   daysFromNow(7, 10, 30),
      endDate:     daysFromNow(7, 17, 0),
      location:    "Seminar Hall, IT Block",
      description: "Industry experts and researchers come together to discuss the latest breakthroughs in AI, deep learning, and generative models. Includes live demos and Q&A.",
      image:       "tech2.jpg",
      maxParticipants: 150,
      createdBy:   nbkr._id,
    },
    {
      // UPCOMING — near future (+30)
      title:       "Code Sprint — DSA Challenge",
      category:    "Tech",
      startDate:   daysFromNow(30, 8, 0),
      endDate:     daysFromNow(31, 20, 0),
      location:    "Computer Lab 3, Block C",
      description: "A timed Data Structures & Algorithms contest on competitive programming platforms. Individual participation. Certificates for all finishers, cash prizes for top 3.",
      image:       "tech3.jpg",
      maxParticipants: 100,
      createdBy:   nbkr._id,
    },
    {
      // UPCOMING — long-term future (+700) [NEW EVENT]
      title:       "Future Tech Conclave 2027",
      category:    "Tech",
      startDate:   daysFromNow(700, 9, 0),
      endDate:     daysFromNow(702, 17, 0),
      location:    "Main Auditorium, Block A",
      description: "A multi-day flagship conclave exploring emerging technologies — quantum computing, robotics, and next-gen software architecture — featuring keynote speakers from across the industry.",
      image: "tech5.jpg",
      maxParticipants: 250,
      createdBy:   nbkr._id,
    },

    /* ════════════════════════════════════════════════════════════
       VIT — 1 Past, 1 Ongoing, 3 Upcoming
    ════════════════════════════════════════════════════════════ */
    {
      // PAST (-15 days)
      title:       "Harmony Fest 2026",
      category:    "Cultural",
      startDate:   daysFromNow(-17, 11, 0),
      endDate:     daysFromNow(-15, 22, 0),
      location:    "Open Air Amphitheatre",
      description: "The biggest cultural extravaganza of the year! Dance, music, drama, and art competitions across 3 days, with inter-college participation and a grand finale performance.",
      image:       "cultural1.jpg",
      maxParticipants: 500,
      createdBy:   vit._id,
    },
    {
      // ONGOING — long-running league spanning the academic year
      title:       "Football Super League",
      category:    "Sports",
      startDate:   daysFromNow(-30, 15, 0),
      endDate:     daysFromNow(1460, 18, 0),
      location:    "Football Ground, East Campus",
      description: "7-a-side football league running across the academic year. 12 college teams registered. Round-robin group stage followed by semis and final. Live commentary and refreshments at the venue.",
      image:       "sports3.jpg",
      maxParticipants: 200,
      createdBy:   vit._id,
    },
    {
      // UPCOMING — near future (+15)
      title:       "Battle of Bands",
      category:    "Cultural",
      startDate:   daysFromNow(15, 16, 0),
      endDate:     daysFromNow(15, 22, 30),
      location:    "College Grounds, Main Stage",
      description: "Rock, pop, fusion — all genres welcome. College bands go head-to-head in front of a live audience and a panel of professional judges. Register your 4–6 member band now.",
      image:       "cultural2.jpg",
      maxParticipants: 80,
      createdBy:   vit._id,
    },
    {
      // UPCOMING — near future (+90)
      title:       "Basketball Championship 2026",
      category:    "Sports",
      startDate:   daysFromNow(90, 8, 30),
      endDate:     daysFromNow(92, 18, 0),
      location:    "Indoor Sports Complex, Court 1",
      description: "Inter-college basketball tournament with 16 teams competing in knockout format. Men's and Women's divisions. Live scoring and streaming available on the college sports portal.",
      image:       "sports1.jpg",
      maxParticipants: 160,
      createdBy:   vit._id,
    },
    {
      // UPCOMING — long-term future (+1400) [NEW EVENT]
      title:       "Global Cultural Exchange Fest 2030",
      category:    "Cultural",
      startDate:   daysFromNow(1400, 11, 0),
      endDate:     daysFromNow(1402, 21, 0),
      location:    "Open Air Amphitheatre",
      description: "A long-horizon flagship cultural exchange event bringing together performers and delegates from partner institutions for a multi-day celebration of art, music, and tradition.",
      image: "cultural5.jpg",
      maxParticipants: 400,
      createdBy:   vit._id,
    },

    /* ════════════════════════════════════════════════════════════
       JNTU — 2 Past, 1 Ongoing, 2 Upcoming
    ════════════════════════════════════════════════════════════ */
    {
      // PAST (-30 days)
      title:       "Classical Dance Competition",
      category:    "Cultural",
      startDate:   daysFromNow(-31, 9, 30),
      endDate:     daysFromNow(-30, 18, 0),
      location:    "Performing Arts Centre",
      description: "A showcase of Bharatanatyam, Kathak, Odissi, and Kuchipudi. Solo and group categories. Judged by nationally recognised Gurus. Recordings will be featured on the college YouTube channel.",
      image:       "cultural4.jpg",
      maxParticipants: 90,
      createdBy:   jntu._id,
    },
    {
      // PAST (-60 days)
      title:       "Yoga & Wellness Day",
      category:    "Sports",
      startDate:   daysFromNow(-60, 6, 0),
      endDate:     daysFromNow(-60, 18, 0),
      location:    "Garden Lawn, Block D",
      description: "A full-day event celebrating physical and mental wellness. Morning yoga session led by certified instructors, followed by meditation, nutrition talks, and fun fitness challenges.",
      image:       "sports4.jpg",
      maxParticipants: 70,
      createdBy:   jntu._id,
    },
    {
      // ONGOING — cross-departmental research program [NEW EVENT]
      title:       "Research Collaboration Initiative",
      category:    "Tech",
      startDate:   daysFromNow(-30, 9, 0),
      endDate:     daysFromNow(1460, 18, 0),
      location:    "Research Block, 2nd Floor",
      description: "An ongoing cross-departmental research initiative connecting students with faculty-led research groups in AI, materials science, and renewable energy. Open enrolment year-round.",
      image: "tech7.jpg",
      maxParticipants: 150,
      createdBy:   jntu._id,
    },
    {
      // UPCOMING — near future (+45)
      title:       "Full-Stack Web Development Bootcamp",
      category:    "Workshop",
      startDate:   daysFromNow(45, 9, 0),
      endDate:     daysFromNow(47, 17, 30),
      location:    "Computer Lab 1, Block B",
      description: "Hands-on 3-day bootcamp covering React, Node.js, Express, and MongoDB. Build and deploy a full-stack project by the end. Laptops required. Limited to 40 participants — register early!",
      image:       "workshop1.jpg",
      maxParticipants: 40,
      createdBy:   jntu._id,
    },
    {
      // UPCOMING — long-term future (+1000) [NEW EVENT]
      title:       "National Robotics Challenge 2029",
      category:    "Tech",
      startDate:   daysFromNow(1000, 9, 0),
      endDate:     daysFromNow(1002, 18, 0),
      location:    "Main Auditorium, Block A",
      description: "A long-horizon national-level robotics competition inviting teams to design, build, and program autonomous robots for a series of engineering challenges.",
      image: "tech6.jpg",
      maxParticipants: 180,
      createdBy:   jntu._id,
    },

    /* ════════════════════════════════════════════════════════════
       SVU — 2 Past, 1 Ongoing, 2 Upcoming
    ════════════════════════════════════════════════════════════ */
    {
      // PAST (-90 days)
      title:       "Entrepreneurship & Startup Workshop",
      category:    "Workshop",
      startDate:   daysFromNow(-91, 9, 30),
      endDate:     daysFromNow(-90, 17, 0),
      location:    "Incubation Centre, Admin Block",
      description: "Startup founders and VCs shared insights on ideation, MVP building, pitching, and funding. Participants presented their startup ideas and received live feedback from a panel of investors.",
      image:       "workshop3.jpg",
      maxParticipants: 60,
      createdBy:   svu._id,
    },
    {
      // PAST (-120 days)
      title:       "Open Source Contribution Drive",
      category:    "Tech",
      startDate:   daysFromNow(-122, 9, 0),
      endDate:     daysFromNow(-120, 17, 30),
      location:    "Innovation Lab, Ground Floor",
      description: "Students collaborated on real-world open source projects hosted on GitHub. Mentors from leading tech companies guided participants through pull requests and code reviews.",
      image:       "tech4.jpg",
      maxParticipants: 80,
      createdBy:   svu._id,
    },
    {
      // ONGOING — recurring design masterclass running across the year
      title:       "UI/UX Design Masterclass",
      category:    "Workshop",
      startDate:   daysFromNow(-30, 10, 0),
      endDate:     daysFromNow(1460, 16, 30),
      location:    "Design Studio, Media Block",
      description: "Learn user research, wireframing, prototyping in Figma, and usability testing from industry designers. Portfolio-worthy projects included. Certificate of completion provided. New cohorts enrolled on a rolling basis.",
      image:       "workshop2.jpg",
      maxParticipants: 60,
      createdBy:   svu._id,
    },
    {
      // UPCOMING — near future (+110)
      title:       "Annual Athletics Meet",
      category:    "Sports",
      startDate:   daysFromNow(110, 7, 0),
      endDate:     daysFromNow(112, 17, 0),
      location:    "College Stadium & Running Track",
      description: "Track and field events including 100m, 400m, relay, long jump, shot put, and javelin throw. Open to all currently enrolled students. Medals and trophies for top 3 in each event.",
      image:       "sports2.jpg",
      maxParticipants: 250,
      createdBy:   svu._id,
    },
    {
      // UPCOMING — long-term future (+1800) [NEW EVENT]
      title:       "Decade of Innovation Summit 2031",
      category:    "Tech",
      startDate:   daysFromNow(1800, 10, 0),
      endDate:     daysFromNow(1801, 17, 0),
      location:    "Seminar Hall, IT Block",
      description: "A long-horizon retrospective and forward-looking summit celebrating a decade of student innovation, featuring alumni speakers and showcases of breakthrough campus projects.",
      image: "tech8.jpg",
      maxParticipants: 200,
      createdBy:   svu._id,
    },
  ];
};

// ─── Main seeder ─────────────────────────────────────────────────────────────
const seedEvents = async () => {
  try {
    await connectDB();
    console.log("\n🌱 Starting Event Seed...\n");

  

    // Resolve the 4 required approved admins by email — these MUST exist
    // (run collegeAdminsSeed.js first).
    const adminEmails = {
      nbkr: "sathyateja116@gmail.com",
      vit:  "sathyateja118@gmail.com",
      jntu: "james.jntu@gmail.com",
      svu:  "emily.svu@gmail.com",
    };

    const adminDocs = await User.find({
      email: { $in: Object.values(adminEmails) },
      role: "college_admin",
      status: "approved",
    });

    const adminMap = {};
    for (const [key, email] of Object.entries(adminEmails)) {
      const doc = adminDocs.find((a) => a.email === email);
      if (!doc) {
        console.error(
          `❌ Required approved admin not found: ${email}\n` +
          "   Please run 'node src/seed/collegeAdminsSeed.js' first."
        );
        process.exit(1);
      }
      adminMap[key] = doc;
    }

    console.log("👤 Resolved all 4 approved admins:");
    Object.entries(adminMap).forEach(([key, doc]) =>
      console.log(`   ${key.toUpperCase()} → ${doc.email} (${doc.college})`)
    );
    console.log("");

    const events = buildEvents(adminMap);

    // currentParticipants will be set to match approved registrations by
    // interactionsSeed.js. At creation time it starts at 0 for every event.
    const existingTitles = await Event.distinct("title");
    const eventsToInsert = [];

for (const event of events) {
  // Skip existing events
  if (existingTitles.includes(event.title)) continue;

  // Upload image to Cloudinary
  const imageUrl = await uploadSeedImage(event.image);

  eventsToInsert.push({
    ...event,
    image: imageUrl,
    currentParticipants: 0,
  });
}

    if (eventsToInsert.length === 0) {
      console.log("ℹ️  All seed events already exist. Nothing to insert.");
    } else {
      console.log(`📦 Inserting ${eventsToInsert.length} missing event(s)...\n`);
      const created = await Event.insertMany(eventsToInsert);
      console.log(`✅ Successfully seeded ${created.length} events:\n`);
      created.forEach((e, i) => {
        console.log(`  ${String(i + 1).padStart(2, "0")}. [${e.category.padEnd(8)}] ${e.title}`);
      });
    }

    // ── Sanity check: confirm exactly 5 events per admin ────────────────
    console.log("\n📊 Verifying per-admin event distribution...");
    for (const [key, doc] of Object.entries(adminMap)) {
      const count = await Event.countDocuments({ createdBy: doc._id });
      console.log(`   ${key.toUpperCase()} (${doc.email}): ${count} events`);
    }

    console.log("\n🎉 Event seeding complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedEvents();
