/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  // Note: 'import {} from ""' syntax does not work in .d.ts files.
  interface Locals {
    // Use the inferred types from our auth config so plugin fields (e.g. admin's `role`) are included.
    user: import('./lib/auth').Session['user'] | null
    session: import('./lib/auth').Session['session'] | null
  }
}
