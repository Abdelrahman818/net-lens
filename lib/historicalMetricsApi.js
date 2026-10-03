/**
 * @typedef {Object} HistoricalMetric
 * @property {string} deviceId
 * @property {string} interfaceId
 * @property {string} metric
 * @property {number} value
 * @property {string} unit
 * @property {string} timestamp
 */

/**
 * @typedef {Object} HistoricalMetricQuery
 * @property {string} [deviceId]
 * @property {string} [interfaceId]
 * @property {string} [metric]
 * @property {string} [from]
 * @property {string} [to]
 * @property {number} [limit]
 * @property {'asc'|'desc'} [sort]
 */

/**
 * @typedef {Object} HistoricalMetricAggregation
 * @property {string} deviceId
 * @property {string} interfaceId
 * @property {string} metric
 * @property {string} unit
 * @property {string} type
 * @property {Array<{ timestamp: string, count: number, average: number, min: number, max: number, sum: number }>} buckets
 */

/**
 * @typedef {Object} HistoricalMetricSummary
 * @property {string} deviceId
 * @property {string} interfaceId
 * @property {string} metric
 * @property {string} unit
 * @property {string} type
 * @property {number} count
 * @property {number|null} min
 * @property {number|null} max
 * @property {number|null} average
 * @property {number|null} delta
 * @property {{ value: number, timestamp: string }|null} first
 * @property {{ value: number, timestamp: string }|null} last
 * @property {{ value: number, timestamp: string }|null} minimum
 * @property {{ value: number, timestamp: string }|null} maximum
 */

/**
 * @typedef {Object} HistoricalMetricComparison
 * @property {string} deviceId
 * @property {string} interfaceId
 * @property {string} metric
 * @property {string} unit
 * @property {string} type
 * @property {HistoricalMetricSummary} current
 * @property {HistoricalMetricSummary} previous
 * @property {{ averageDelta: number|null, averagePercentChange: number|null, minDelta: number|null, maxDelta: number|null, countDelta: number }} comparison
 */

/**
 * @typedef {Object} HistoricalMetricTrend
 * @property {string} deviceId
 * @property {string} interfaceId
 * @property {string} metric
 * @property {string} unit
 * @property {string} type
 * @property {HistoricalMetricSummary} summary
 * @property {'increasing'|'decreasing'|'stable'|'insufficient_data'} trend
 */

/**
 * @typedef {Object} HistoricalMetricLatest
 * @property {string} deviceId
 * @property {string} interfaceId
 * @property {string} metric
 * @property {number} value
 * @property {string} unit
 * @property {string} timestamp
 */

import API from "@/config";


export const HISTORICAL_METRIC_OPTIONS = ["inBps", "outBps", "inUtilization", "outUtilization"];

function validateParams(params = {}) {
  if (params.metric !== undefined && !HISTORICAL_METRIC_OPTIONS.includes(params.metric)) {
    throw new TypeError("metric must be a supported historical metric");
  }
  for (const key of ["from", "to"]) {
    if (params[key] !== undefined && Number.isNaN(new Date(params[key]).getTime())) {
      throw new TypeError(`${key} must be a valid date`);
    }
  }
  if (params.limit !== undefined && (!Number.isInteger(Number(params.limit)) || Number(params.limit) < 1)) {
    throw new TypeError("limit must be a positive integer");
  }
  if (params.sort !== undefined && !["asc", "desc"].includes(params.sort)) {
    throw new TypeError("sort must be asc or desc");
  }
}

function requiredId(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} is required`);
  return value.trim();
}

export function getHistoricalTimeRange(rangeKey = "1h", endTime = new Date()) {
  const now = endTime instanceof Date ? endTime : new Date(endTime);
  const ranges = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };

  const offset = ranges[rangeKey] ?? ranges["1h"];
  const from = new Date(now.getTime() - offset);

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

export function buildQueryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, String(entry)));
      return;
    }

    search.append(key, String(value));
  });

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

export function buildHistoricalMetricsUrl(endpoint, params = {}) {
  const queryString = buildQueryString(params);
  return `${endpoint}${queryString}`;
}

export function queryHistoricalMetrics(params = {}, options = {}) {
  validateParams(params);
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.query, params), options).then((response) => response.json());
}

export function getHistoricalMetricsByDevice(deviceId, params = {}, options = {}) {
  validateParams(params);
  deviceId = requiredId(deviceId, "deviceId");
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.byDevice(deviceId), params), options).then((response) => response.json());
}

export function getHistoricalMetricsByInterface(deviceId, interfaceId, params = {}, options = {}) {
  validateParams(params);
  deviceId = requiredId(deviceId, "deviceId");
  interfaceId = requiredId(interfaceId, "interfaceId");
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.byInterface(deviceId, interfaceId), params), options).then((response) => response.json());
}

export function getLatestHistoricalMetric(params = {}, options = {}) {
  validateParams(params);
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.latest, params), options).then((response) => response.json());
}

export function aggregateHistoricalMetrics(params = {}, options = {}) {
  validateParams(params);
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.aggregate, params), options).then((response) => response.json());
}

export function getHistoricalMetricSummary(params = {}, options = {}) {
  validateParams(params);
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.analyticsSummary, params), options).then((response) => response.json());
}

export function compareHistoricalPeriods(params = {}, options = {}) {
  validateParams(params);
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.analyticsCompare, params), options).then((response) => response.json());
}

export function getHistoricalMetricTrend(params = {}, options = {}) {
  validateParams(params);
  return API.fetch(buildHistoricalMetricsUrl(API.routes.historicalMetrics.analyticsTrend, params), options).then((response) => response.json());
}
