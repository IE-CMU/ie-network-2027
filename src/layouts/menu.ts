import { type Locale } from '@utils/locale'

// Shared menu types used by Menu.astro, MenuDesktop.astro and MenuMobile.astro.

export type MenuLabel = Record<Locale, string>

// A leaf item that navigates to a page.
export interface MenuLink {
  label: MenuLabel
  url: string
}

// A group with no page target; it only opens a submenu.
// `tone: 'role'` marks the logged-in working-area menus (Participant, Admin),
// rendered with a violet tint to set them apart from the public site menu.
export interface MenuGroup {
  label: MenuLabel
  children: MenuLink[]
  tone?: 'role'
}

export type MenuItem = MenuLink | MenuGroup

export function isMenuGroup(item: MenuItem): item is MenuGroup {
  return 'children' in item
}

// Minimal user info needed to render the account menu.
export interface MenuUser {
  name: string
  email: string
  initial: string
}

// Links/labels for the account area of the menu.
export interface AccountMenu {
  user: MenuUser | null
  links: MenuLink[]
  logout: { label: MenuLabel; redirectUrl: string }
  login: MenuLink
}
