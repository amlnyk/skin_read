import { t } from '@/i18n';
import { groupName, ingredientName } from '@/logic/analyze';
import { fillTemplate } from '@/logic/routine';
import { productCategorySchema, QUESTION_IDS } from '@/schemas';
import type {
  ContentBundle,
  ObservationKind,
  Product,
  ProductCategory,
  RoutineObservation,
  Slot,
} from '@/types';

// Turns one observation of the routine analysis into words. The logic gives ids and keys; the
// texts come from the content (observation templates, rules, questionnaire options, ingredient
// names) and from the interface dictionary. Nothing is invented: when the content has no text
// the screen says "Інформація готується". There are no numbers and no verdicts anywhere.

export type ObservationContent = Pick<
  ContentBundle,
  'observationTemplates' | 'compatRules' | 'ingredients' | 'ingredientGroups' | 'questionnaire'
>;

export type ObservationView = {
  id: string;
  severity: RoutineObservation['severity'];
  kind: ObservationKind;
  /** What was found: from the template, or "being prepared". */
  text: string;
  /** Why it matters: from the template or the rule, or "being prepared" (a personal reason is worded here). */
  why: string;
  /** Short lines of facts the logic knows: when, which components, what the profile says. */
  facts: string[];
  /** The products the observation is about, to link to their cards. */
  products: { id: string; name: string }[];
  /** The rule behind a conflict, when the content has one. */
  ruleSource: string | null;
};

const filled = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim() !== '';

const pending = () => t('common.contentPending');

function optionLabel(
  content: ObservationContent,
  questionId: string,
  optionId: string,
): string | null {
  const label = content.questionnaire
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId)?.label;
  return filled(label) ? label : null;
}

/** A condition or a reaction group, worded the way the questionnaire worded it. */
function profileValueLabel(content: ObservationContent, value: string): string {
  return (
    optionLabel(content, QUESTION_IDS.conditions, value) ??
    optionLabel(content, QUESTION_IDS.reactions, value) ??
    pending()
  );
}

export function slotsLabel(slots: readonly string[]): string {
  const am = slots.includes('am');
  const pm = slots.includes('pm');
  if (am && pm) return t('analysis.slotBoth');
  if (am) return t('analysis.slotAm');
  if (pm) return t('analysis.slotPm');
  return t('analysis.slotNone');
}

const isSlot = (value: string): value is Slot => value === 'am' || value === 'pm';
const isCategory = (value: string): value is ProductCategory =>
  productCategorySchema.safeParse(value).success;

export function describeRoutineObservation(
  observation: RoutineObservation,
  content: ObservationContent,
  products: readonly Pick<Product, 'id' | 'name'>[],
): ObservationView {
  const { params } = observation;
  const slots = (params['slots'] ?? []).filter(isSlot);
  const keys = params['keys'] ?? [];
  const ingredients = params['ingredients'] ?? [];
  const groups = params['groups'] ?? [];
  const categories = (params['categories'] ?? []).filter(isCategory);

  const related = observation.relatedProductIds.map((id) => ({
    id,
    name: products.find((product) => product.id === id)?.name ?? id,
  }));

  const componentNames = [
    ...ingredients.map((id) => ingredientName(id, content.ingredients)),
    ...(ingredients.length === 0
      ? groups.map((id) => groupName(id, content.ingredientGroups) ?? pending())
      : []),
  ].join(', ');
  const categoryNames = categories.map((category) => t(`category.${category}`)).join(', ');

  const template = content.observationTemplates.find((item) => item.id === observation.templateId);
  const values = {
    products: related.map((item) => item.name).join(', '),
    slots: slotsLabel(slots),
    names: componentNames,
    categories: categoryNames,
  };
  const text = filled(template?.text) ? fillTemplate(template.text, values) : pending();

  const rule = observation.ruleId
    ? content.compatRules.find((item) => item.id === observation.ruleId)
    : undefined;

  const facts: string[] = [];
  let personalWhy: string | null = null;

  switch (observation.kind) {
    case 'missing_base_step':
      facts.push(t('analysis.missingLine', { category: categoryNames, slots: slotsLabel(slots) }));
      break;
    case 'personal_restriction': {
      const name = keys
        .map((key) => optionLabel(content, QUESTION_IDS.reactions, key) ?? pending())
        .join(', ');
      if (slots.length > 0) facts.push(t('analysis.slotLine', { slots: slotsLabel(slots) }));
      if (componentNames !== '')
        facts.push(t('analysis.componentsLine', { names: componentNames }));
      if (name !== '') personalWhy = t('analysis.reactionLine', { name });
      break;
    }
    case 'preference_mismatch': {
      const name = keys
        .map((key) => optionLabel(content, QUESTION_IDS.avoid, key) ?? pending())
        .join(', ');
      if (slots.length > 0) facts.push(t('analysis.slotLine', { slots: slotsLabel(slots) }));
      if (componentNames !== '')
        facts.push(t('analysis.componentsLine', { names: componentNames }));
      personalWhy = t('analysis.wishLine', { name });
      break;
    }
    case 'conflict': {
      facts.push(t('analysis.slotLine', { slots: slotsLabel(slots) }));
      if (componentNames !== '')
        facts.push(t('analysis.componentsLine', { names: componentNames }));
      const conditions = (params['conditions'] ?? []).map((value) =>
        profileValueLabel(content, value),
      );
      if (conditions.length > 0)
        facts.push(t('analysis.escalationLine', { list: conditions.join(', ') }));
      if (filled(rule?.timingAdvice))
        facts.push(t('analysis.timingLine', { text: rule.timingAdvice }));
      break;
    }
    case 'many_actives_in_slot':
      facts.push(t('analysis.slotLine', { slots: slotsLabel(slots) }));
      break;
    case 'duplicate_active': {
      if (slots.length > 0) facts.push(t('analysis.slotLine', { slots: slotsLabel(slots) }));
      const names = groups
        .map((id) => groupName(id, content.ingredientGroups) ?? pending())
        .join(', ');
      if (names !== '') facts.push(t('analysis.componentsLine', { names }));
      break;
    }
    case 'incomplete_data':
      facts.push(
        keys.includes('no_composition')
          ? t('analysis.noCompositionLine')
          : t('analysis.lowCoverageLine'),
      );
      break;
    case 'doctor_note': {
      const name = keys
        .map((key) => optionLabel(content, QUESTION_IDS.safetyFlags, key) ?? pending())
        .join(', ');
      facts.push(t('analysis.medicalLine', { name }));
      break;
    }
    case 'ingredient_caution':
      break;
  }

  const why = filled(template?.why)
    ? fillTemplate(template.why, values)
    : filled(rule?.explanation)
      ? rule.explanation
      : (personalWhy ?? pending());

  return {
    id: observation.id,
    severity: observation.severity,
    kind: observation.kind,
    text,
    why,
    facts,
    products: related,
    ruleSource: rule && filled(rule.source) ? rule.source : null,
  };
}
