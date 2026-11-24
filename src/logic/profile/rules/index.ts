import { barrierFirst } from './barrierFirst';
import { baseType } from './baseType';
import { currentConditions } from './currentConditions';
import { cycleDiary } from './cycleDiary';
import { dangerSigns } from './dangerSigns';
import { minorMode } from './minorMode';
import { personalRestrictions } from './personalRestrictions';
import { preferences } from './preferences';
import type { Rule } from '../ruleTypes';

// Goals (priority 6) have no rule: they do not change the mode, they only decide
// the optional steps of the routine at stage 5.
const ALL_RULES: readonly Rule[] = [
  preferences,
  baseType,
  cycleDiary,
  currentConditions,
  barrierFirst,
  minorMode,
  personalRestrictions,
  dangerSigns,
];

/** Rules from the strongest (priority 1) to the weakest. Stable for equal priorities. */
export const RULES: readonly Rule[] = [...ALL_RULES].sort((a, b) => a.priority - b.priority);
