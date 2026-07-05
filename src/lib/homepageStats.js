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

export function formatHomepageStats(stats) {
  const normalizedStats = normalizeHomepageStats(stats);
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return [
    {
      value: String(normalizedStats.propertiesReviewed),
      label: 'Properties Reviewed',
    },
    {
      value: `${normalizedStats.estimatedTimelineDays} Days`,
      label: 'Estimated Timeline',
    },
    {
      value: currencyFormatter.format(normalizedStats.estimatedCashOffer),
      label: 'Estimated Cash Offer',
    },
    {
      value: `${normalizedStats.reviewCompletePercent}%`,
      label: 'Review Complete',
    },
  ];
}
