// Account name and affiliation. Kept free of DB imports so client
// components can use it.
//
// Both are set once, when the account is created: from CMT for authors
// (paper import), from the sign-up form for participants (magic link,
// src/components/auth/MagicLink.vue). Nobody can change them afterwards
// (better-auth's /update-user is disabled in src/lib/auth/create.ts).

export const USER_NAME_MAX = 200
export const USER_AFFILIATION_MAX = 300

/** How long a magic link (and the sign-up details waiting for it) stays valid. */
export const MAGIC_LINK_EXPIRES_S = 5 * 60
