export const OPERATORS = [
  {
    name: 'OR',
    value: '',
  },
  {
    name: 'AND',
    value: '+',
  },
  {
    name: 'NOT',
    value: '-',
  },
];

export const OPERATORS_EXCLUDE_FROM_VIEWER = [
  'NOT',
];

export const DEFAULT_OPERATOR = 'OR';

/**
 * deconstructQuery
 * @description Transforms the active search term into an array of objects
 */

export function deconstructQuery(query, fieldId = 'all', query_group = []) {

  if ( typeof query !== 'string' || query.length === 0 ) return query_group;

  if ( !Array.isArray(query_group) ) {
    query_group = [];
  }

  const term = {
    value: query,
    type: 'term',
    operator: DEFAULT_OPERATOR,
    fieldId,
  };

  query_group.push(term);

  return query_group.map((segment, index) => {
    return {
      ...segment,
      index,
    }
  });

}

/**
 * constructQuery
 * @description Transforms a search group into a contructed API query
  */
export function constructQuery(query) {

  if ( typeof query === 'string' ) return encodeURIComponent(query);

  return query.map((segment, index) => {

    if ( segment.type !== 'term' || typeof segment.value !== 'string' ) return undefined;

    let keyword = '';
    let operator;

    if ( segment.operator ) {

      operator = OPERATORS.find((operator) => operator.name === segment.operator);

      if ( operator && operator.value ) {
        keyword += operator.value;
      }

    }

    keyword += segment.value.trim();

    return encodeURIComponent(keyword);

  }).filter(segment => !!(segment)).join(',');

}

/**
 * constructViewerQuery
 * @description Transforms a search group into a contructed viewer query. Excludes any NOT operator terms
 */

export function constructViewerQuery(query) {

  if ( typeof query === 'string' ) return encodeURIComponent(query);

  return query.map((segment, index) => {

    const default_value = undefined;

    if ( segment.type !== 'term' || typeof segment.value !== 'string' ) return default_value;

    let keyword = '';

    if ( segment.operator && OPERATORS_EXCLUDE_FROM_VIEWER.includes(segment.operator) ) {
      return default_value;
    }

    keyword += segment.value.trim();

    return encodeURIComponent(keyword);

  }).filter(segment => !!(segment)).join(',');

}


/**
 * parseQuery
 * @description Transforms an Elastic Serach formulated query into a deconstructed query
 */

export function parseQuery(keywords, fields = 'all') {
  // FIXME: https://github.com/iodepo/OceanBestPractices/issues/199
  let query = [];

  if ( typeof keywords !== 'string' ) return query;

  const splitKeywords = keywords.split(',');
  const splitFields = fields.split(',');

  return splitKeywords.map((segment, index) => {
    let query = segment;
    let first_char = query.charAt(0);
    let operator = OPERATORS.find((operator) => operator.value === first_char);

    if ( operator ) {
      operator = operator.name;
      query = query.substr(1);
    } else {
      operator = DEFAULT_OPERATOR;
    }

    return {
      value: query,
      type: 'term',
      fieldId: index < splitFields.length ? splitFields[index] : splitFields.slice(-1).pop(),
      operator,
      index,
    }

  });

}


/**
 * activeQueryOperatorsString
 * @description Returns a delimited string of active operators
 */

export function activeQueryOperatorsString(active_search = []) {

  if ( !Array.isArray(active_search) ) return;

  const active_search_operators = active_search.map(term => typeof term.operator === 'string' && term.operator.toLowerCase());

  return OPERATORS.map(operator => typeof operator.name === 'string' && operator.name.toLowerCase())
    .filter(operator => active_search_operators.includes(operator));

}
