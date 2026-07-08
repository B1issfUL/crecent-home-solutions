export const DEFAULT_HOME_STATS = {
  propertiesReviewed: 0,
  estimatedTimelineDays: 0,
  estimatedCashOffer: 0,
  reviewCompletePercent: 0,
};

export function toWholeNumber(value, fallback = 0) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.floor(numberValue));
}

export function normalizeHomepageStats(data = {}) {
  return {
    propertiesReviewed: toWholeNumber(data.propertiesReviewed),
    estimatedTimelineDays: toWholeNumber(data.estimatedTimelineDays),
    estimatedCashOffer: toWholeNumber(data.estimatedCashOffer),
    reviewCompletePercent: Math.min(100, toWholeNumber(data.reviewCompletePercent)),
  };
}

const DEFAULT_STAT_LABELS = {
  propertiesReviewed: 'Properties Reviewed',
  estimatedTimeline: 'Estimated Timeline',
  estimatedCashOffer: 'Estimated Cash Offer',
  reviewComplete: 'Review Complete',
  days: 'Days',
};

export function formatHomepageStats(stats, labels = DEFAULT_STAT_LABELS) {
  const normalizedStats = normalizeHomepageStats(stats);
  const metricLabels = { ...DEFAULT_STAT_LABELS, ...labels };
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return [
    {
      value: String(normalizedStats.propertiesReviewed),
      label: metricLabels.propertiesReviewed,
    },
    {
      value: `${normalizedStats.estimatedTimelineDays} ${metricLabels.days}`,
      label: metricLabels.estimatedTimeline,
    },
    {
      value: currencyFormatter.format(normalizedStats.estimatedCashOffer),
      label: metricLabels.estimatedCashOffer,
    },
    {
      value: `${normalizedStats.reviewCompletePercent}%`,
      label: metricLabels.reviewComplete,
    },
  ];
}
