// Models
import { ActivityLog } from '../models/activity-log';

// Helpers
import { empty, getStr } from '../utils';

//--------------------------------------------------------------
/*
    Central place every panel controller reports a create/update/delete/
    status-change through, instead of each module hand-rolling its own text
    summary (the old ProductAuditLog/DealerAuditLog pattern). `diff()` is the
    generic field-comparison utility that pattern never had - every prior log
    entry was a manually-written string with no structured old/new values.
*/

export interface IActivityLogFieldConfig {
    key: string;
    label: string;
}

export interface IActivityLogChangeRow {
    field: string;
    label: string;
    oldValue: any;
    newValue: any;
}

const getClientIp = (req: any): string => {
    return (req?.headers?.['x-forwarded-for'] || '').toString().split(',')[0].trim() || req?.socket?.remoteAddress || req?.ip || '';
}

const getClientAgent = (req: any): string => {
    const ua = req?.useragent;
    if (empty(ua)) return req?.headers?.['user-agent'] || '';
    return `${ua.browser || ''} ${ua.version || ''} on ${ua.os || ''}`.trim();
}

// two values are "the same" for audit purposes if they're loosely-equal
// primitives, or - for arrays/objects - deep-equal by stable JSON shape {
const valuesDiffer = (a: any, b: any): boolean => {
    const aEmpty = empty(a);
    const bEmpty = empty(b);
    if (aEmpty && bEmpty) return false;
    if (aEmpty !== bEmpty) return true;

    if (typeof a === 'object' || typeof b === 'object') {
        return JSON.stringify(a) !== JSON.stringify(b);
    }
    return getStr(a) !== getStr(b);
}
// }

export default class ActivityLogCore {

    // shared "who did this" fields, read off req.panelUser (set by PanelAuth
    // on every authenticated panel request) - exposed separately from log()
    // so a bulk operation (e.g. Settings' Bulk Price Adjustment, one entry
    // per affected product) can build several entries with one insertMany
    // instead of one round-trip per entry {
    static actorFields(req: any): { performedBy: any; performedByName: string | null; performedByRole: string | null; ipAddress: string; userAgent: string } {
        const panelUser = req?.panelUser;
        const role = panelUser?.rolePermissionId;

        return {
            performedBy: panelUser?._id || null,
            performedByName: panelUser ? `${panelUser.firstName || ''} ${panelUser.lastName || ''}`.trim() : null,
            performedByRole: role?.permission?.isMaster ? 'Super Admin' : (role?.name || null),
            ipAddress: getClientIp(req),
            userAgent: getClientAgent(req),
        };
    }
    // } actorFields

    // compares oldObj/newObj across a curated field list (dot-notation keys,
    // e.g. 'pricing.price') and returns only the entries that actually
    // changed {
    static diff(oldObj: any, newObj: any, fields: IActivityLogFieldConfig[]): IActivityLogChangeRow[] {
        const readPath = (obj: any, path: string): any => path.split('.').reduce((acc: any, key: string) => (acc == null ? acc : acc[key]), obj);

        const changes: IActivityLogChangeRow[] = [];
        for (const { key, label } of fields) {
            const oldValue = readPath(oldObj, key);
            const newValue = readPath(newObj, key);
            if (valuesDiffer(oldValue, newValue)) {
                changes.push({ field: key, label, oldValue: oldValue ?? null, newValue: newValue ?? null });
            }
        }
        return changes;
    }
    // } diff

    // diff() only compares scalar/nested-object fields - a Variable product's
    // per-variation price/stock/lowStockThreshold live inside the `variations`
    // array instead, which diff()'s dot-path reader can't reach. Matches old
    // vs new variations by SKU first (required on every variation, and the
    // one identifier guaranteed present on BOTH sides - the product edit
    // form's parsed submission never carries the old _id at all, so keying
    // on _id first would silently fail to match anything there), falling
    // back to _id only when a caller's plain object happens to lack a sku.
    // Reports each changed field labeled with that variation's own SKU, e.g.
    // "Variation SKU-123 Price" - this is what makes a variation-only edit
    // (or a Stock & Price Update import row) show up with real details
    // instead of an empty, un-clickable log entry - both used to have no way
    // to reach this data {
    static diffVariations(oldVariations: any[] = [], newVariations: any[] = []): IActivityLogChangeRow[] {
        const changes: IActivityLogChangeRow[] = [];
        const oldById = new Map((oldVariations || []).map((v: any) => [getStr(v.sku) || getStr(v._id), v]));

        (newVariations || []).forEach((newV: any) => {
            const oldV = oldById.get(getStr(newV.sku) || getStr(newV._id));
            if (!oldV) return; // newly added variation - nothing to diff against

            const label = newV.sku || oldV.sku || getStr(newV._id);
            const fields: IActivityLogFieldConfig[] = [
                { key: 'price', label: `Variation "${label}" Price` },
                { key: 'stockQuantity', label: `Variation "${label}" Stock` },
                { key: 'lowStockThreshold', label: `Variation "${label}" Low Stock Threshold` },
            ];
            changes.push(...this.diff(oldV, newV, fields).map((c) => ({ ...c, field: `variations.${label}.${c.field}` })));
        });

        return changes;
    }
    // } diffVariations

    // builds a short human-readable line out of a change list, e.g.
    // "Price: 100 -> 120, Status: DRAFT -> ACTIVE" (truncated past ~4 fields) {
    static summarize(changes: IActivityLogChangeRow[]): string {
        if (!changes.length) return 'No field changes recorded.';

        const shown = changes.slice(0, 4).map((c) => `${c.label}: ${c.oldValue ?? '-'} → ${c.newValue ?? '-'}`);
        const rest = changes.length - shown.length;
        return shown.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
    }
    // } summarize

    // writes one ActivityLog entry, reading "who" off req.panelUser (set by
    // PanelAuth on every authenticated panel request) {
    static async log(options: {
        req: any;
        module: string;
        entityId?: any;
        entityLabel?: string | null;
        action: string;
        changes?: IActivityLogChangeRow[];
        summary?: string;
    }): Promise<void> {
        const { req, module, entityId = null, entityLabel = null, action, changes = [], summary } = options;

        await ActivityLog.create({
            module,
            entityId: entityId || null,
            entityLabel,
            action,
            changes,
            summary: summary || this.summarize(changes),
            ...this.actorFields(req),
        });
    }
    // } log

}
