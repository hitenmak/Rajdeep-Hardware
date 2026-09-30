// Models
import { Counter } from '../models/counter';

//--------------------------------------------------------------
/*
    Atomic, gap-tolerant sequences (PO numbers etc.). Replaces "countDocuments() + 1",
    which hands the same number to two concurrent creates and re-issues numbers after deletes.
*/

export const SEQUENCE = {
    PURCHASE_ORDER: 'PURCHASE_ORDER',
};

export default class Sequence {

    // `seed` runs once, the first time a sequence is used, so numbering continues from existing data
    static async next(name: string, seed?: () => Promise<number>): Promise<number> {
        const bumped: any = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true }).lean();
        if (bumped) return bumped.seq;

        try {
            await Counter.create({ _id: name, seq: seed ? await seed() : 0 });
        } catch (e: any) {
            if (e?.code !== 11000) throw e; // a concurrent request seeded it first - fine
        }

        const created: any = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true }).lean();
        return created.seq;
    }

}
