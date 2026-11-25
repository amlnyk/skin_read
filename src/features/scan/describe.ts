import { t } from '@/i18n';
import { ingredientName } from '@/logic/analyze';
import type { Observation, Product, SkinProfile } from '@/types';
import {
  avoidLabel,
  conditionLabel,
  groupLabel,
  namesOf,
  reactionLabel,
  safetyLabel,
  type LabelContent,
} from './labels';

// The words of one observation. The logic gives only ids and keys; the text is written here,
// from the content and the interface dictionary. Wording is neutral: a wish is a wish, a
// possible match is "possible", and nothing here says "safe" or "forbidden".

type Context = {
  content: LabelContent;
  profile: Pick<SkinProfile, 'conditions'> | null;
  products: readonly Pick<Product, 'id' | 'name'>[];
};

const filled = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== '';

function subjectNames(observation: Observation, content: LabelContent): string {
  const ingredients =
    observation.ingredientIds.length > 0 ? namesOf(observation.ingredientIds, content) : '';
  if (ingredients !== '') return ingredients;
  return observation.groupIds.map((id) => groupLabel(id, content)).join(', ');
}

function productNames(ids: readonly string[], products: Context['products']): string {
  return ids.map((id) => products.find((product) => product.id === id)?.name ?? id).join(', ');
}

function personal(observation: Observation, { content }: Context): string[] {
  const names = subjectNames(observation, content);
  const key = observation.key ?? '';
  const line =
    observation.via === 'ingredient'
      ? t('scan.personalIngredient', { names })
      : observation.via === 'text'
        ? t('scan.personalText', { names })
        : t('scan.personalGroup', { label: reactionLabel(content, key), names });
  return observation.possible ? [line, t('scan.possibleTag')] : [line];
}

function caution(observation: Observation, { content, profile }: Context): string[] {
  const id = observation.ingredientIds[0] ?? '';
  const entry = content.ingredients.find((item) => item.id === id)?.cautions[
    Number(observation.key)
  ];
  const text = filled(entry?.text) ? entry.text : t('scan.pending');
  const lines = [t('scan.cautionLine', { name: ingredientName(id, content.ingredients), text })];
  const shared = (entry?.conditions ?? []).filter((condition) =>
    profile?.conditions.includes(condition),
  );
  if (shared.length > 0) {
    lines.push(
      t('scan.cautionConditions', {
        list: shared.map((item) => conditionLabel(content, item)).join(', '),
      }),
    );
  }
  if (observation.possible) lines.push(t('scan.possibleTag'));
  return lines;
}

function conflict(observation: Observation, { content, products }: Context): string[] {
  const [a, b] = [...observation.ingredientIds, ...observation.groupIds];
  const name = (id: string | undefined) =>
    id === undefined
      ? t('scan.pending')
      : observation.ingredientIds.includes(id)
        ? ingredientName(id, content.ingredients)
        : groupLabel(id, content);
  const slot =
    observation.slot === 'am'
      ? t('scan.conflictSlotAm')
      : observation.slot === 'pm'
        ? t('scan.conflictSlotPm')
        : '';
  const lines = [
    t('scan.conflictLine', {
      a: name(a),
      b: name(b),
      product: productNames(observation.productIds, products),
      slot,
    }),
  ];
  if (observation.key === 'caution' || observation.key === 'not_recommended_for_profile') {
    lines.push(
      t('scan.conflictRuleStatus', { status: t(`compat.status.${observation.key}.title`) }),
    );
  }
  const rule = content.compatRules.find((entry) => entry.id === observation.ruleId);
  if (rule) lines.push(filled(rule.explanation) ? rule.explanation : t('scan.pending'));
  if (observation.possible) lines.push(t('scan.possibleTag'));
  return lines;
}

function duplicate(observation: Observation, { content, products }: Context): string[] {
  const group = observation.groupIds[0];
  const lines = [
    t('scan.duplicateLine', {
      group: group === undefined ? t('scan.pending') : groupLabel(group, content),
      products: productNames(observation.productIds, products),
    }),
  ];
  if (observation.possible) lines.push(t('scan.possibleTag'));
  return lines;
}

function wish(observation: Observation, { content }: Context): string[] {
  const line = t('scan.wishLine', {
    label: avoidLabel(content, observation.key ?? ''),
    names: subjectNames(observation, content),
  });
  return observation.possible ? [line, t('scan.possibleTag')] : [line];
}

/** The lines of text for one observation. */
export function describeObservation(observation: Observation, context: Context): string[] {
  switch (observation.kind) {
    case 'personal_restriction':
      return personal(observation, context);
    case 'doctor_note':
      return [t('scan.doctorNote', { label: safetyLabel(context.content, observation.key ?? '') })];
    case 'ingredient_caution':
      return caution(observation, context);
    case 'conflict':
      return conflict(observation, context);
    case 'duplicate_active':
      return duplicate(observation, context);
    case 'preference_mismatch':
      return wish(observation, context);
    default:
      return [];
  }
}

export type { Context as DescribeContext };
