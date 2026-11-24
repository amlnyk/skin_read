import { z } from 'zod';
import { idSchema } from './common';

// The list of needs is calculated from the routine and the profile (logic/routine
// buildShoppingNeeds). Only what the user did with an item is saved, by the item id:
// "done" and "removed from the list". Texts and priorities are never saved.
export const shoppingNeedSchema = z.object({
  id: idSchema,
  done: z.boolean(),
  dismissed: z.boolean(),
});
export type ShoppingNeed = z.infer<typeof shoppingNeedSchema>;
