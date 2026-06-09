export const venueScores = {
  nature: 1.0,
  science: 1.0,

  neurips: 0.95,
  icml: 0.95,
  iclr: 0.95,
  jmlr: 0.95,

  acl: 0.9,
  emnlp: 0.9,
  cvpr: 0.9,

  ieee: 0.85,
  springer: 0.8,
  elsevier: 0.8
};

export function getAuthorityScore(venue) {
  if (!venue) return 0.5;

  const lower = venue.toLowerCase();

  for (const [key, score] of Object.entries(venueScores)) {
    if (lower.includes(key)) {
      return score;
    }
  }

  return 0.5;
}