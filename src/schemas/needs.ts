import { z } from 'zod';
import { LIMITS, idSchema } from './common';
import { needPrioritySchema, productCategorySchema } from './enums';

export const shoppingNeedSchema = z.object({
  id: idSchema,
  category: productCategorySchema,
  purpose: z.string().max(LIMITS.shortText),
  characteristics: z.array(z.string().max(LIMITS.shortText)),
  warnings: z.array(z.string().max(LIMITS.shortText)),
  priority: needPrioritySchema,
  done: z.boolean(),
});
export type ShoppingNeed = z.infer<typeof shoppingNeedSchema>;
