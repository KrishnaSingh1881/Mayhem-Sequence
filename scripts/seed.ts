
import { db } from "../src/lib/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting seed process...");

  // 1. Clear existing data
  console.log("🧹 Clearing existing data...");
  db.prepare("DELETE FROM feedback").run();
  db.prepare("DELETE FROM feedback_tokens").run();
  db.prepare("DELETE FROM issues").run();
  db.prepare("DELETE FROM builds").run();
  db.prepare("DELETE FROM project_config").run();
  db.prepare("DELETE FROM project_members").run();
  db.prepare("DELETE FROM projects").run();
  db.prepare("DELETE FROM users").run();

  // 2. Create User
  console.log("👤 Creating user...");
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash("password123", 10);
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash)
    VALUES (?, ?, ?, ?)
  `).run(userId, "admin@mayhem.com", "Admin User", passwordHash);

  // 3. Create Project
  console.log("🎮 Creating project...");
  const projectId = uuidv4();
  db.prepare(`
    INSERT INTO projects (id, name, genre, platforms, description, status, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    "Neon Overdrive",
    "Action RPG",
    "PC, PS5",
    "A high-octane cyberpunk RPG with rhythmic combat and deep customization.",
    "active",
    userId
  );

  // 4. Create Project Config
  db.prepare(`
    INSERT INTO project_config (id, project_id, negative_feedback_threshold, bug_volume_threshold, feedback_stale_days)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), projectId, 10, 5, 7);

  // 5. Create Builds
  console.log("📦 Creating builds...");
  const builds = [
    { id: uuidv4(), version: "v0.1.0-alpha", label: "Alpha", date: "2024-03-26" },
    { id: uuidv4(), version: "v0.2.0-beta", label: "Beta", date: "2024-04-10" },
    { id: uuidv4(), version: "v0.3.0-rc", label: "Production", date: "2024-04-20" },
    { id: uuidv4(), version: "v0.4.0-nightly", label: "Nightly", date: "2024-04-25" },
  ];

  for (const build of builds) {
    db.prepare(`
      INSERT INTO builds (id, project_id, version_name, label, upload_type, file_size, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      build.id,
      projectId,
      build.version,
      build.label,
      "manual",
      1024 * 1024 * 1500, // 1.5GB
      `Internal build for ${build.label} testing.`,
      userId,
      new Date(build.date).toISOString()
    );
  }

  const mainBuildId = builds[2].id; // Production build

  // 6. Create Issues
  console.log("🐛 Creating issues...");
  const issueData = [
    { title: "Physics glitch on jump", priority: "high", status: "open", platform: "PC", cat: "Gameplay" },
    { title: "Performance drop in neon district", priority: "critical", status: "in_progress", platform: "PS5", cat: "Performance" },
    { title: "Typo in main menu", priority: "low", status: "resolved", platform: "PC", cat: "UI" },
    { title: "Save game corruption", priority: "critical", status: "open", platform: "PC", cat: "Core" },
    { title: "UI scaling on ultrawide", priority: "medium", status: "open", platform: "PC", cat: "UI" },
    { title: "Audio desync in cutscenes", priority: "medium", status: "in_progress", platform: "PS5", cat: "Audio" },
  ];

  for (const issue of issueData) {
    db.prepare(`
      INSERT INTO issues (id, project_id, build_id, title, description, priority, status, platform_tag, category_tag, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      projectId,
      mainBuildId,
      issue.title,
      `Reported during ${issue.platform} testing session.`,
      issue.priority,
      issue.status,
      issue.platform,
      issue.cat,
      userId
    );
  }

  // 7. Create Feedback Tokens
  console.log("🔑 Creating feedback tokens...");
  const discordToken = uuidv4().slice(0, 8);
  const redditToken = uuidv4().slice(0, 8);
  
  db.prepare(`
    INSERT INTO feedback_tokens (id, project_id, build_id, token, label, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), projectId, mainBuildId, discordToken, "Discord Community", userId);

  db.prepare(`
    INSERT INTO feedback_tokens (id, project_id, build_id, token, label, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), projectId, mainBuildId, redditToken, "Reddit Beta Sub", userId);

  // 8. Create Feedback
  console.log("💬 Creating feedback...");
  const feedbackData = [
    { rating: 5, enjoy: "The combat feels amazing!", broken: "None", cat: "Gameplay", sentiment: "positive" },
    { rating: 4, enjoy: "Graphics are top notch", broken: "Small stuttering", cat: "Graphics", sentiment: "positive" },
    { rating: 2, enjoy: "Story is okay", broken: "Crashed 3 times", cat: "Stability", sentiment: "negative" },
    { rating: 5, enjoy: "Best cyberpunk vibes", broken: "None", cat: "Art", sentiment: "positive" },
    { rating: 1, enjoy: "Nothing", broken: "Cant even launch", cat: "Core", sentiment: "negative" },
    { rating: 4, enjoy: "Love the music", broken: "Audio pops", cat: "Audio", sentiment: "positive" },
    { rating: 3, enjoy: "Good potential", broken: "Controls are floaty", cat: "Gameplay", sentiment: "neutral" },
    { rating: 5, enjoy: "Smooth experience", broken: "None", cat: "Performance", sentiment: "positive" },
    { rating: 2, enjoy: "UI is pretty", broken: "Inventory is bugged", cat: "UI", sentiment: "negative" },
    { rating: 4, enjoy: "Fun mechanics", broken: "Minor clipping", cat: "Gameplay", sentiment: "positive" },
    { rating: 3, enjoy: "Okay for an alpha", broken: "Many placeholders", cat: "Content", sentiment: "neutral" },
    { rating: 1, enjoy: "Disappointed", broken: "Losing progress on save", cat: "Core", sentiment: "negative" },
    { rating: 5, enjoy: "Wow!", broken: "None", cat: "Overall", sentiment: "positive" },
    { rating: 4, enjoy: "Great weapon variety", broken: "Reloading is slow", cat: "Gameplay", sentiment: "positive" },
    { rating: 2, enjoy: "Nice world", broken: "Falling through map", cat: "Physics", sentiment: "negative" },
  ];

  for (const f of feedbackData) {
    db.prepare(`
      INSERT INTO feedback (id, project_id, build_id, rating, text_enjoy, text_broken, category_tag, sentiment, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      projectId,
      mainBuildId,
      f.rating,
      f.enjoy,
      f.broken,
      f.cat,
      f.sentiment,
      "direct"
    );
  }

  console.log("✅ Seed complete!");
  console.log(`User: admin@mayhem.com / password123`);
  console.log(`Project ID: ${projectId}`);
}

seed().catch(console.error);
