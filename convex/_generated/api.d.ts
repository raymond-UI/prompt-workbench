/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as experiments from "../experiments.js";
import type * as llm from "../llm.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  experiments: typeof experiments;
  llm: typeof llm;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  llmCache: {
    cache: {
      get: FunctionReference<
        "query",
        "internal",
        { cacheKey: string },
        {
          _creationTime: number;
          _id: string;
          cacheKey: string;
          createdAt: number;
          expiresAt?: number;
          hitCount: number;
          lastAccessedAt: number;
          metadata?: any;
          model: string;
          modelVersion?: string;
          request: any;
          response: any;
          tags?: Array<string>;
          ttlTier: number;
        } | null
      >;
      incrementHitCount: FunctionReference<
        "mutation",
        "internal",
        { cacheKey: string },
        null
      >;
      lookup: FunctionReference<
        "query",
        "internal",
        { modelVersion?: string; request: any },
        {
          _creationTime: number;
          _id: string;
          cacheKey: string;
          createdAt: number;
          expiresAt?: number;
          hitCount: number;
          lastAccessedAt: number;
          metadata?: any;
          model: string;
          modelVersion?: string;
          request: any;
          response: any;
          tags?: Array<string>;
          ttlTier: number;
        } | null
      >;
      store: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          modelVersion?: string;
          pin?: boolean;
          request: any;
          response: any;
          tags?: Array<string>;
        },
        string
      >;
    };
    cleanup: {
      cleanup: FunctionReference<
        "action",
        "internal",
        { batchSize?: number; dryRun?: boolean },
        { deletedCount: number; hasMore: boolean; keys: Array<string> }
      >;
    };
    config: {
      getConfig: FunctionReference<
        "query",
        "internal",
        {},
        {
          defaultTtlMs?: number;
          maxEntries?: number;
          normalizeRequests?: boolean;
          promotionTtlMs?: number;
          ttlByModel?: Record<string, number>;
          ttlByTag?: Record<string, number>;
        }
      >;
      getStats: FunctionReference<
        "query",
        "internal",
        {},
        {
          entriesByModel: Record<string, number>;
          hitsByModel: Record<string, number>;
          newestEntry?: number;
          oldestEntry?: number;
          totalEntries: number;
          totalHits: number;
        }
      >;
      setConfig: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            defaultTtlMs?: number;
            maxEntries?: number;
            normalizeRequests?: boolean;
            promotionTtlMs?: number;
            ttlByModel?: Record<string, number>;
            ttlByTag?: Record<string, number>;
          };
          replace?: boolean;
        },
        null
      >;
    };
    manage: {
      invalidate: FunctionReference<
        "mutation",
        "internal",
        {
          before?: number;
          cacheKey?: string;
          model?: string;
          modelVersion?: string;
          tag?: string;
        },
        number
      >;
    };
    queries: {
      history: FunctionReference<
        "query",
        "internal",
        { request: any },
        Array<{
          cacheKey: string;
          isCurrent: boolean;
          metadata?: any;
          model: string;
          modelVersion?: string;
          request: any;
          response: any;
          storedAt: number;
          tags?: Array<string>;
        }>
      >;
      queryEntries: FunctionReference<
        "query",
        "internal",
        {
          after?: number;
          before?: number;
          limit?: number;
          model?: string;
          tag?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          cacheKey: string;
          createdAt: number;
          expiresAt?: number;
          hitCount: number;
          lastAccessedAt: number;
          metadata?: any;
          model: string;
          modelVersion?: string;
          request: any;
          response: any;
          tags?: Array<string>;
          ttlTier: number;
        }>
      >;
    };
  };
};
