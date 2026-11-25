import { t } from '@/i18n';
import { SYMPTOM_KEYS } from '@/logic/journal';
import type { Intensity, JournalEntry, Product } from '@/types';

/** The readable lines of one entry. Names of products are looked up; a removed product is skipped. */
export function describeEntry(entry: JournalEntry, products: readonly Product[]): string[] {
  const lines: string[] = [];
  if (entry.feeling !== undefined) {
    lines.push(t('journal.entryFeeling', { value: t(`journal.feelingOption.${entry.feeling}`) }));
  }
  for (const key of SYMPTOM_KEYS) {
    const level: Intensity | undefined = entry.symptoms[key];
    if (level !== undefined) {
      lines.push(`${t(`journal.symptom.${key}`)}${': '}${t(`journal.intensity.${level}`)}`);
    }
  }
  if (entry.shavingIrritation !== undefined) {
    lines.push(
      t('journal.entryShaving', { value: t(`journal.intensity.${entry.shavingIrritation}`) }),
    );
  }
  if (entry.cyclePeriod !== undefined) {
    lines.push(t('journal.entryCycle', { value: t(`journal.cycleOption.${entry.cyclePeriod}`) }));
  }
  const names = entry.newProductIds
    .map((id) => products.find((product) => product.id === id)?.name)
    .filter((name): name is string => name !== undefined);
  if (names.length > 0) lines.push(t('journal.entryNewProducts', { names: names.join(', ') }));
  return lines;
}
