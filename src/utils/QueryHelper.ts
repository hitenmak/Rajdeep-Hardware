import mongoose from 'mongoose';

// Helpers
import { logError } from './Log';
import { empty } from './Values';

// Others
import { PAGINATION_OPTIONS } from '../config/Constant';
//--------------------------------------------------------------

/*
    Shared query helpers for logic that doesn't map onto a single native Mongoose call
    (a custom aggregation pipeline, a generic exists-check used dynamically by Sanitize.ts,
    an upsert that generates its own id, and mongoose-paginate-v2 option merging).
    Everything that was a pure one-line passthrough to a native Mongoose static
    (create, insertMany, updateMany, findByIdAndUpdate, findById, findOne, findByIdAndDelete,
    deleteMany) has been removed - call the native Mongoose method directly instead.
*/

export const findRecords = async (Model: any, query: any = {}, options: any = {}): Promise<any> => {
    const ERROR_KEY = '[FIND-RECORDS] -';
    try {
        delete options.query; // delete query key from options
        options = { ...PAGINATION_OPTIONS, pagination: false, ...options };
        const records = await Model.paginate(query, options);
        return records?.docs || [];
    } catch (e: any) {
        logError(e, ERROR_KEY);
        return null;
    }
};

export const paginateAggregate = async (Model: any, preQuery: any = {}, postQuery: any[] = [], options: any = {}) => {
    const ERROR_KEY = '[PAGINATE-AGGREGATE] -';
    try {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const populate = options.populate || [];

        // --- Normalize sort ---
        let sort: any = {};
        if (options.sort && typeof options.sort === 'object' && Object.keys(options.sort).length > 0) {
            // Convert "ASC"/"DESC" strings to 1/-1
            for (const key in options.sort) {
                const val = options.sort[key];
                sort[key] = (val?.toString().toUpperCase() === 'ASC') ? 1 : -1;
            }
        }
        // Default sort if empty
        if (!sort || Object.keys(sort).length === 0) sort = { _id: -1 };

        const pipeline: any[] = [];

        // --- Pre-lookup filters (direct fields) ---
        const preMatchQuery = { ...preQuery };
        if (preMatchQuery.$or) delete preMatchQuery.$or; // $or applied after lookup
        if (Object.keys(preMatchQuery).length > 0) pipeline.push({ $match: preMatchQuery });

        // --- Lookups for populated fields ---
        for (const pop of populate) {
            pipeline.push({
                $lookup: {
                    from: pop.model,
                    localField: pop.path,
                    foreignField: '_id',
                    as: pop.path,
                },
            });
            pipeline.push({
                $unwind: {
                    path: `$${pop.path}`,
                    preserveNullAndEmptyArrays: true,
                },
            });
        }

        // --- Post-lookup search filters ($or) ---
        if (postQuery.length > 0) pipeline.push({ $match: { $or: postQuery } });

        // --- Safe sort stage ---
        pipeline.push({ $sort: sort });

        // --- Pagination using $facet ---
        pipeline.push({
            $facet: {
                records: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                ],
                totalCount: [{ $count: 'count' }],
            },
        });

        const result = await Model.aggregate(pipeline);
        const records = result[0]?.records || [];
        const total = result[0]?.totalCount[0]?.count || 0;

        return {
            total,
            pages: Math.ceil(total / limit),
            current: page,
            limit,
            records,
        };
    } catch (e: any) {
        logError(e, ERROR_KEY);
        return {
            total: 0,
            pages: 0,
            current: options.page || 1,
            limit: options.limit || 10,
            records: [],
        };
    }
};

export const upsertOne = async (Model: any, query: any = {}, data: any = {}): Promise<any> => {
    const ERROR_KEY = '[UPSERT-ONE] -';
    try {
        if (empty(query)) query._id = new mongoose.Types.ObjectId();
        return await Model.findOneAndUpdate(query, data, { new: true, upsert: true }).lean();
    } catch (e: any) {
        logError(e, ERROR_KEY);
        return null;
    }
};

export const existsByField = async (Model: any, key: string, value: any, notConsiderKey?: string, notConsiderValue?: any): Promise<boolean> => {
    const query: any = { [key]: value };
    if (notConsiderKey) query[notConsiderKey] = { $ne: notConsiderValue };
    const result = await Model.findOne(query).lean();
    return !!result;
};
