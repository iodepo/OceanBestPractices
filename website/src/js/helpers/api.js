import { OPERATORS } from '../helpers/query';

export const baseAPIURL = process.env.REACT_APP_API_ENDPOINT;
export const defaultQuerySize = 50;
export const defaultQueryOffset = 0;
export const env = baseAPIURL.substr(baseAPIURL.lastIndexOf('/') + 1);
export const documentBucketSource = process.env.REACT_APP_STACK_NAME || '';


// Creates the autocomplete url

export const createAPIAutocompleteURL = (query, synonyms = false) => {

  let url = `${ baseAPIURL }/documents/autocomplete/`;

  if (query && query.length) {
    url = `${url}?input=${ encodeURIComponent(query) }`
  }

  if ( synonyms ) {
    url = addParam(url, 'synonyms', synonyms);
  }

  return url;
}


// Creates the search url based on the provided params

export const createAPISearchURL = (searchGroups, options) => {

  let url = `${ baseAPIURL }/documents?keywords=${ buildKeywordsQueryParameter(searchGroups, options.fields) }`;

  let size = options.size || defaultQuerySize;
  let offset = options.offset || defaultQueryOffset;
  let sort = options.sort;
  let term = options.term;
  let termURI = options.termURI;
  let synonyms = options.synonyms;
  let refereed = options.refereed;
  let endorsed = options.endorsed;

  if ( size ) {
    url = addParam(url, 'size', size);
  }

  if ( offset ) {
    url = addParam(url, 'from', offset);
  }

  if ( sort ) {
    url = addParam(url, 'sort', sort);
  }

  if ( term ) {
    url = addParam(url, 'term', encodeURIComponent(term));
  }

  if ( termURI ) {
    url = addParam(url, 'termURI', encodeURIComponent(termURI));
  }

  if ( synonyms ) {
    url = addParam(url, 'synonyms', synonyms);
  }

  if ( refereed ) {
    url = addParam(url, 'refereed', refereed);
  }

  if ( endorsed ) {
    url = addParam(url, 'endorsed', endorsed);
  }

  return url;
}


// Creates the relationships url based on the provided query

export const createAPIRelationshipsURL = (query) => {
  let url = `${ baseAPIURL }/terms/graph/?termURI=${ encodeURIComponent(query) }`;
  return url;
}


// Creates the stats url

export const createAPIStatsURL = () => {
  const url = `${ baseAPIURL }/statistics/`;
  return url;
}

// Creates the tagger url

export const createAPITaggerURL = () => {
  let url = `${ baseAPIURL }/documents/preview/`;
  return url;
}

export const createAPITaggerCSVURL = () => {
  let url = `${ baseAPIURL }/documents/preview?form=csv`;
  return url;
}


// Adds the parameters based on parameter name and value

export const addParam = (url, paramType, paramValue) => {
  return `${url}&${paramType}=${paramValue}`;
}

/**
 * Builds a URL query parameter
 */

export function buildKeywordsQueryParameter(searchGroups, fields) {
  if ( typeof searchGroups === 'string' ) {
    return encodeURIComponent(searchGroups);
  }

  return searchGroups.map((searchGroup, index) => {
    if (searchGroup.type !== 'term' || typeof searchGroup.value !== 'string') {
      return undefined;
    }

    const operator = OPERATORS.find((operator) => operator.name === searchGroup.operator);

    // Get the fields we're targeting with this keyword. Fields can have multiple
    // values so we might end up appending multiple keywords for this searchGroup.
    const field = fields.find((f) => f.id === searchGroup.fieldId) || { value: ['*'] };
    
    const keywords = field.value.map((v) => {
      //return encodeURI(`${encodeURIComponent(operator.value)}:${v}:${searchGroup.value.trim()}`);
      //return encodeURIComponent(`${operator.value}:${v}:${searchGroup.value.trim()}`);
      return encodeURIComponent(
        `${operator.value}:${v}:${searchGroup.value.replace(/[\.\:\;\,\[\]\(\)]/g,'').trim()}`
      );
      //return `${operator.value}`;
    });

    return keywords.join(',');
    //return keywords;

  }).filter(searchGroup => !!(searchGroup)).join(',');

}
