import { randomUUID } from "crypto";
import { db, getOrCreateProjectConfig, insertAlert, insertFeedback } from "@/lib/db";

const POSITIVE_KEYWORDS = [
  "love",
  "great",
  "amazing",
  "excellent",
  "smooth",
  "fun",
  "satisfying",
  "perfect",
  "works well",
];

const NEGATIVE_KEYWORDS = [
  "crash",
  "broken",
  "bug",
  "laggy",
  "confused",
  "frustrating",
  "unplayable",
  "disappear",
  "freeze",
  "error",
];

export type FeedbackSubmissionInput = {
  projectId: string;
  buildId: string;
  tokenId?: string | null;
  submittedBy?: string | null;
  rating: number;
  textEnjoy?: string | null;
  textBroken?: string | null;
  categoryTag: string;
  platformPlayed?: string | null;
  source: "link" | "internal";
};

function countKeywordHits(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.reduce((total, keyword) => {
    if (!normalized.includes(keyword)) {
      return total;
    }
    return total + 1;
  }, 0);
}

export function classifySentiment(
  textEnjoy: string | null | undefined,
  textBroken: string | null | undefined,
  rating: number
) {
  const text = `${textEnjoy ?? ""} ${textBroken ?? ""}`.trim().toLowerCase();
  const positiveHits = countKeywordHits(text, POSITIVE_KEYWORDS);
  const negativeHits = countKeywordHits(text, NEGATIVE_KEYWORDS);

  if (negativeHits > positiveHits) return "negative" as const;
  if (positiveHits > negativeHits) return "positive" as const;
  if (positiveHits === 0 && negativeHits === 0) {
    if (rating >= 4) return "positive" as const;
    if (rating <= 1) return "negative" as const;
    return "neutral" as const;
  }
  return "neutral" as const;
}

export function submitFeedback(input: FeedbackSubmissionInput) {
  const sentiment = classifySentiment(input.textEnjoy, input.textBroken, input.rating);
  const feedbackId = randomUUID();

  db.transaction(() => {
    insertFeedback({
      id: feedbackId,
      project_id: input.projectId,
      build_id: input.buildId,
      token_id: input.tokenId ?? null,
      submitted_by: input.submittedBy ?? null,
      rating: input.rating,
      text_enjoy: input.textEnjoy ?? null,
      text_broken: input.textBroken ?? null,
      category_tag: input.categoryTag,
      platform_played: input.platformPlayed ?? null,
      sentiment,
      source: input.source,
    });

    const config = getOrCreateProjectConfig(input.projectId);
    const negativeCount = db
      .prepare(
        `SELECT COUNT(*) as count
         FROM feedback
         WHERE build_id = ?
           AND sentiment = 'negative'
           AND datetime(created_at) >= datetime('now', '-24 hours')`
      )
      .get(input.buildId) as { count: number };

    if (negativeCount.count >= config.negative_feedback_threshold) {
      const existingUnread = db
        .prepare(
          `SELECT id FROM alerts
           WHERE project_id = ?
             AND build_id = ?
             AND type = 'negative_feedback_spike'
             AND is_read = 0
           LIMIT 1`
        )
        .get(input.projectId, input.buildId);

      if (!existingUnread) {
        insertAlert({
          id: randomUUID(),
          project_id: input.projectId,
          build_id: input.buildId,
          type: "negative_feedback_spike",
          message: `Negative feedback crossed threshold (${negativeCount.count}) in the last 24h.`,
        });
      }
    }

    db.prepare(
      "UPDATE ai_cache SET is_stale = 1 WHERE project_id = ? AND build_id = ? AND feature_type IN ('cluster', 'summary')"
    ).run(input.projectId, input.buildId);
  })();

  return {
    id: feedbackId,
    sentiment,
  };
}
