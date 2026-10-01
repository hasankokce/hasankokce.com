import {isAdmin} from './auth';
import {createTicket} from '../runtime/analytics';
import Tracker from './analytics-tracker';
export default async function AnalyticsBoot(){if(await isAdmin())return null;return <Tracker ticket={createTicket()}/>}
