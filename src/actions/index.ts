import { paper } from './paper'
import { user } from './user'

// Called as actions.<namespace>.<action>, e.g. actions.paper.import(form).
export const server = {
  paper,
  user,
}
