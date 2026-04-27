# 🧪 Platform Testing Guide

This guide provides step-by-step instructions for verifying the core features of Mayhem-Sequence. Ensure you have run `npm run seed` before starting.

---

## 🛠️ Testing Environment
- **Primary Admin**: `admin@mayhem.com` / `password123`
- **Project**: "Neon Overdrive"

---

## 📋 Test Suites

### 1. Authentication & Authorization
| Action | Expected Result |
| :--- | :--- |
| Login with admin credentials | Successful redirect to Projects dashboard. |
| Try to access `/api/projects` without cookie | 401 Unauthorized response. |
| Access Project Settings as a Player role | Redirected or "Access Denied" shown. |

### 2. Build Management & AI Expander
1. Go to **Neon Overdrive** project.
2. Click **Upload Build**.
3. Fill in basic details.
4. In the **Notes** section, type: `fixed jump bug, added new level, player speed increased`.
5. Click **✨ Expand with AI**.
   - **Expectation**: Notes are transformed into structured sections (What Changed, QA Notes).
6. Save the build.
   - **Expectation**: Build appears in the list with a "new" tag.

### 3. Automated Regression Check
1. Identify a "Resolved" issue from a previous build (e.g., "Typo in main menu").
2. Create a **New Issue** for your latest build with a similar title: "Typo in main menu again".
3. Refresh the **Build Detail** page.
   - **Expectation**: A "⚠️ Potential Regression" flag appears in the alerts area.
   - **Verify**: The flag correctly links the new issue to the historically resolved one.

### 4. Feedback & AI Clustering
1. Navigate to **Feedback Explorer**.
2. If no clusters exist, click **Regenerate Clusters**.
   - **Expectation**: AI analyzes raw feedback and creates "Suggested Issues" cards below the charts.
3. Click "Create Issue" on a suggestion card.
   - **Expectation**: Create Issue drawer opens pre-filled with AI-suggested details.

### 5. Release Readiness Report
1. Go to a build with the label **"Testing"**.
2. Click the **📋 Release Readiness** button.
   - **Expectation**: A modal appears with a Confidence Score (0-100%).
   - **Verification**: Ensure the AI summary accurately reflects the number of open blockers and sentiment ratio.

### 6. Tester Leaderboard
1. Perform several actions (file an issue, comment on an issue, submit feedback).
2. Go to the **Project Overview** page.
3. Scroll to the **Leaderboard** section.
   - **Expectation**: Your user appears with an updated score (Points: Issues=3, Comments=1, Feedback=2).

---

## 🐞 Bug Reporting
If you encounter any issues during testing:
1. Open the Browser Console (F12) to check for API errors.
2. Verify the terminal output for SQLite constraints or AI timeout warnings.
3. Check `data/mayhem-sequence.db` using a SQLite browser to verify data persistence.
