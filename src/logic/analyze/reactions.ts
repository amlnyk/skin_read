import type { Product, SkinProfile } from '@/types';

// "I had a reaction to this product" (stage 8). The person points at the components she
// suspects; the profile remembers them, and the next checks warn about them.
//
// Pure: the time comes as an ISO string. Marking changes the profile, so its revision goes up
// (the old checks then show "the profile has changed", and the routine knows it was built for
// an older profile unless the caller moves `careSetup.builtForRevision` along).

export type ReactionMarked = {
  profile: SkinProfile;
  product: Product;
  /** The ids that were really new for the profile. */
  added: string[];
};

export function markReaction(
  profile: SkinProfile,
  product: Product,
  ingredientIds: readonly string[],
  nowIso: string,
): ReactionMarked {
  const chosen = [...new Set(ingredientIds)];
  const added = chosen.filter((id) => !profile.reactionIngredients.includes(id));
  const nextProfile: SkinProfile =
    added.length === 0
      ? profile
      : {
          ...profile,
          reactionIngredients: [...profile.reactionIngredients, ...added],
          revision: profile.revision + 1,
          updatedAt: nowIso,
        };
  const nextProduct: Product = {
    ...product,
    userReactions: [...product.userReactions, { at: nowIso, note: chosen.join(', ') }],
  };
  return { profile: nextProfile, product: nextProduct, added };
}
