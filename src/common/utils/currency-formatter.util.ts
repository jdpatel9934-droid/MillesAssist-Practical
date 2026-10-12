export class CurrencyFormatter {
  static format(amount: number | string, currency: string = 'USD'): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) {
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  }

  static formatCompact(amount: number | string, currency: string = 'USD'): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) {
      return '$0';
    }

    if (numericAmount >= 1_000_000) {
      return `$${(numericAmount / 1_000_000).toFixed(1)}M`;
    }
    if (numericAmount >= 1_000) {
      return `$${(numericAmount / 1_000).toFixed(0)}K`;
    }
    return `$${numericAmount.toFixed(0)}`;
  }
}
