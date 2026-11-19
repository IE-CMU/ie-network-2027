import { billing } from './billing'
import { paper } from './paper'
import { typeChange } from './typeChange'
import { user } from './user'

// Called as actions.<namespace>.<action>, e.g. actions.paper.import(form).
export const server = {
  billing,
  paper,
  typeChange,
  user,
}
